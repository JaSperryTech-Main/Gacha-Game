document.addEventListener("DOMContentLoaded", () => {
  let coinCount = 0;
  let coinsPerClick = 1;
  let upgrades = 0;
  let upgradeCost = 10;
  let gachaCost = 20;
  let autoClickerCost = 100;
  let autoClickerActive = false;
  let autoClickerInterval = null;
  let gachaHistory = [];
  let gachaRarities = ["Common", "Rare", "Epic"];
  let collectedItems = [];
  let allItems = [
    {
      name: "Coin Multiplier",
      effect: "Increase coins per click by 2",
      type: "coinMultiplier",
      count: 0,
      upgradeGoal: 5,
    },
    {
      name: "Upgrade Boost",
      effect: "Reduce upgrade cost by 10%",
      type: "upgradeBoost",
      count: 0,
      upgradeGoal: 3,
    },
    {
      name: "Auto Clicker Boost",
      effect: "Increase auto-clicker efficiency by 1 coin per second.",
      type: "autoClickerBoost",
      count: 0,
      upgradeGoal: 5,
    },
  ];

  const coinCountElement = document.getElementById("coin-count");
  const clickerButton = document.getElementById("clicker-button");
  const upgradeButton = document.getElementById("upgrade-button");
  const gachaButton = document.getElementById("gacha-button");
  const autoClickerButton = document.getElementById("auto-clicker-button");
  const coinsPerClickElement = document.getElementById("coins-per-click");
  const upgradeStatusElement = document.getElementById("upgrade-status");
  const gachaHistoryElement = document.getElementById("gacha-history");
  const itemInventoryElement = document.getElementById("item-inventory");
  const autoClickerStatusElement = document.getElementById("auto-clicker-status");
  const upgradeCostElement = document.getElementById("upgrade-cost");
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabSections = document.querySelectorAll(".tab-section");

  const dbName = "gameStateDB";
  let db;

  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => {
        db = request.result;
        if (!db.objectStoreNames.contains("gameData")) {
          db.createObjectStore("gameData", { keyPath: "id" });
        }
      };
      request.onerror = () => {
        reject("Error opening IndexedDB");
      };
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };
    });
  };

  const saveGameData = () => {
    const transaction = db.transaction(["gameData"], "readwrite");
    const store = transaction.objectStore("gameData");
    const gameState = {
      id: 1,
      coinCount,
      coinsPerClick,
      upgrades,
      upgradeCost,
      gachaCost,
      autoClickerCost,
      autoClickerActive,
      gachaHistory,
      collectedItems,
      allItems,
    };
    store.put(gameState);
  };

  const loadGameData = () => {
    const transaction = db.transaction(["gameData"], "readonly");
    const store = transaction.objectStore("gameData");
    const request = store.get(1);
    request.onsuccess = (e) => {
      const gameState = e.target.result;
      if (gameState) {
        coinCount = gameState.coinCount;
        coinsPerClick = gameState.coinsPerClick;
        upgrades = gameState.upgrades;
        upgradeCost = gameState.upgradeCost;
        gachaCost = gameState.gachaCost;
        autoClickerCost = gameState.autoClickerCost;
        autoClickerActive = gameState.autoClickerActive;
        gachaHistory = gameState.gachaHistory;
        collectedItems = gameState.collectedItems;
        allItems = gameState.allItems || allItems;

        // Apply bonuses based on collected items
        applyItemBonuses();  // Apply the item bonuses here

        // Update UI elements
        updateCoinCount();
        coinsPerClickElement.textContent = `Coins per click: ${coinsPerClick}`;
        upgradeStatusElement.textContent = `Upgrades: ${upgrades}`;
        updateGachaHistory();
        updateItemInventory();

        if (autoClickerActive) {
          autoClickerInterval = setInterval(() => {
            coinCount += coinsPerClick;
            updateCoinCount();
            saveGameData();
          }, 1000);
          autoClickerStatusElement.textContent = "Active";
        }

        // Update the upgrade cost display here after the game state has loaded
        if (upgradeCostElement) {
          upgradeCostElement.textContent = `Next upgrade cost: ${upgradeCost} coins`;
        }
      }
    };
    request.onerror = () => {
      console.log("Error loading game data from IndexedDB");
    };
  };

  const initializeGame = async () => {
    await openDB();
    loadGameData();
  };

  const updateCoinCount = () => {
    coinCountElement.textContent = `Coins: ${coinCount}`;
  };

  window.addEventListener("beforeunload", (event) => {
    saveGameData();
    event.preventDefault();
  });

  function switchTab(tabId) {
    tabButtons.forEach((button) => button.classList.remove("active"));
    tabSections.forEach((section) => {
      section.classList.remove("active");
      section.style.display = "none";
    });

    const activeTabButton = document.getElementById(`tab-${tabId}`);
    activeTabButton.classList.add("active");

    const activeTabSection = document.getElementById(`${tabId}-section`);
    activeTabSection.classList.add("active");
    activeTabSection.style.display = "block";
  }

  switchTab("collection");

  tabButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const tabId = event.target.id.replace("tab-", "");
      switchTab(tabId);
    });
  });

  clickerButton.addEventListener("click", () => {
    coinCount += coinsPerClick;
    updateCoinCount();
    saveGameData();
  });

  // Update the upgrade status and display the current upgrade cost
  upgradeButton.addEventListener("click", () => {
    if (coinCount >= upgradeCost) {
      coinCount -= upgradeCost;
      upgrades++;
      coinsPerClick = 1 + upgrades;
      upgradeCost = Math.floor(upgradeCost * 1.5); // Increase cost by 1.5x
      updateCoinCount();
      coinsPerClickElement.textContent = `Coins per click: ${coinsPerClick}`;
      upgradeStatusElement.textContent = `Upgrades: ${upgrades}`;

      // Update the upgrade cost display
      upgradeCostElement.textContent = `Next upgrade cost: ${upgradeCost} coins`;

      saveGameData();
    } else {
      alert("Not enough coins to upgrade!");
    }
  });

  gachaButton.addEventListener("click", () => {
    if (coinCount >= gachaCost) {
      coinCount -= gachaCost;
      updateCoinCount();
      const rarity =
        gachaRarities[Math.floor(Math.random() * gachaRarities.length)];
      let item = getRandomItem();
      if (item) {
        item.count++;
        collectedItems.push(item);
        addToGachaHistory(item.name, rarity);
        const existingItem = allItems.find((i) => i.name === item.name);
        if (existingItem) {
          existingItem.count = item.count;
        }
        updateItemInventory();
      }
      saveGameData();
    } else {
      alert("Not enough coins for a Gacha pull!");
    }
  });

  autoClickerButton.addEventListener("click", () => {
    if (coinCount >= autoClickerCost) {
      coinCount -= autoClickerCost;
      updateCoinCount();
      autoClickerActive = !autoClickerActive;

      if (autoClickerActive) {
        autoClickerInterval = setInterval(() => {
          coinCount += coinsPerClick;
          updateCoinCount();
          saveGameData();
        }, 1000);
        autoClickerStatusElement.textContent = "Active";
      } else {
        clearInterval(autoClickerInterval);
        autoClickerStatusElement.textContent = "Inactive";
      }
      saveGameData();
    } else {
      alert("Not enough coins to buy Auto-Clicker!");
    }
  });

  // Apply the bonuses based on collected items
  const applyItemBonuses = () => {
    // Apply Coin Multiplier bonus
    const coinMultiplierItem = allItems.find(item => item.type === 'coinMultiplier');
    if (coinMultiplierItem) {
      coinsPerClick = 1 + (coinMultiplierItem.count * 2); // Increase coins per click by 2 for each item
    }

    // Apply Upgrade Boost bonus
    const upgradeBoostItem = allItems.find(item => item.type === 'upgradeBoost');
    if (upgradeBoostItem) {
      const upgradeBoostFactor = 1 - (upgradeBoostItem.count * 0.1); // Reduce cost by 10% for each item
      upgradeCost = Math.floor(upgradeCost * upgradeBoostFactor); // Update upgrade cost with the bonus
    }

    // Apply Auto Clicker Boost
    const autoClickerBoostItem = allItems.find(item => item.type === 'autoClickerBoost');
    if (autoClickerBoostItem) {
      const autoClickerBoost = autoClickerBoostItem.count; // Increase efficiency by 1 coin per second per item
      if (autoClickerActive) {
        clearInterval(autoClickerInterval);
        autoClickerInterval = setInterval(() => {
          coinCount += coinsPerClick + autoClickerBoost; // Apply the boost to auto-clicker efficiency
          updateCoinCount();
          saveGameData();
        }, 1000);
      }
    }

    // Update UI elements after applying bonuses
    coinsPerClickElement.textContent = `Coins per click: ${coinsPerClick}`;
    upgradeCostElement.textContent = `Next upgrade cost: ${upgradeCost} coins`;
  };

  const updateGachaHistory = () => {
    gachaHistoryElement.innerHTML = gachaHistory.map((entry) => {
      return `<li>${entry.item} (${entry.rarity})</li>`;
    }).join('');
  };

  const updateItemInventory = () => {
    itemInventoryElement.innerHTML = allItems.map((item) => {
      return `<li>${item.name} (x${item.count})</li>`;
    }).join('');
  };

  const getRandomItem = () => {
    const rareItems = allItems.filter(item => item.count < item.upgradeGoal);
    return rareItems[Math.floor(Math.random() * rareItems.length)];
  };

  const addToGachaHistory = (itemName, rarity) => {
    gachaHistory.unshift({ item: itemName, rarity });
    if (gachaHistory.length > 10) {
      gachaHistory.pop();
    }
  };

  initializeGame();
});
