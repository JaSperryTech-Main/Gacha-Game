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
  ];

  // DOM elements
  const coinCountElement = document.getElementById("coin-count");
  const clickerButton = document.getElementById("clicker-button");
  const upgradeButton = document.getElementById("upgrade-button");
  const gachaButton = document.getElementById("gacha-button");
  const autoClickerButton = document.getElementById("auto-clicker-button");
  const coinsPerClickElement = document.getElementById("coins-per-click");
  const upgradeStatusElement = document.getElementById("upgrade-status");
  const gachaHistoryElement = document.getElementById("gacha-history");
  const itemInventoryElement = document.getElementById("item-inventory");
  const autoClickerStatusElement = document.getElementById(
    "auto-clicker-status"
  );
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabSections = document.querySelectorAll(".tab-section");

  const dbName = "gameStateDB";
  let db;

  // Open IndexedDB and load game state if it exists
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

  // Save game state to IndexedDB
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
      autoClickerActive, // Save the autoClicker state
      gachaHistory,
      collectedItems,
      allItems, // Ensure the allItems are also saved
    };
    store.put(gameState);
  };

  // Load game state from IndexedDB
  const loadGameData = () => {
    const transaction = db.transaction(["gameData"], "readonly");
    const store = transaction.objectStore("gameData");
    const request = store.get(1);

    request.onsuccess = (e) => {
      const gameState = e.target.result;
      if (gameState) {
        // Load all game data
        coinCount = gameState.coinCount;
        coinsPerClick = gameState.coinsPerClick;
        upgrades = gameState.upgrades;
        upgradeCost = gameState.upgradeCost;
        gachaCost = gameState.gachaCost;
        autoClickerCost = gameState.autoClickerCost;
        autoClickerActive = gameState.autoClickerActive; // Load the autoClicker state
        gachaHistory = gameState.gachaHistory;
        collectedItems = gameState.collectedItems;
        allItems = gameState.allItems || allItems; // Ensure allItems is initialized

        // After loading the data, update the UI
        updateCoinCount();
        coinsPerClickElement.textContent = coinsPerClick;
        upgradeStatusElement.textContent = `Upgrades: ${upgrades}`;
        updateGachaHistory();
        updateItemInventory(); // Update inventory after loading saved data

        // If the auto clicker was active, restart it
        if (autoClickerActive) {
          autoClickerInterval = setInterval(() => {
            coinCount += coinsPerClick;
            updateCoinCount();
            saveGameData();
          }, 1000);
          autoClickerStatusElement.textContent = "Active";
        }
      }
    };

    request.onerror = () => {
      console.log("Error loading game data from IndexedDB");
    };
  };

  // Initialize the game, loading the game state if available
  const initializeGame = async () => {
    await openDB();
    loadGameData(); // Load game data after IndexedDB is opened
  };

  // Function to update the coin count display
  function updateCoinCount() {
    coinCountElement.textContent = `Coins: ${coinCount}`;
  }

  // Force save when exiting or reloading
  window.addEventListener("beforeunload", (event) => {
    saveGameData(); // Ensure game state is saved when the user exits or reloads the page
    event.preventDefault(); // Prevent the default behavior (closing the page)
  });

  function switchTab(tabId) {
    // Remove 'active' class from all buttons and sections
    tabButtons.forEach((button) => button.classList.remove("active"));
    tabSections.forEach((section) => {
      section.classList.remove("active");
      section.style.display = "none"; // Hide all sections by default
    });

    // Add 'active' class to the selected tab button
    const activeTabButton = document.getElementById(`tab-${tabId}`);
    activeTabButton.classList.add("active");

    // Add 'active' class to the corresponding tab section and make it visible
    const activeTabSection = document.getElementById(`${tabId}-section`);
    activeTabSection.classList.add("active");
    activeTabSection.style.display = "block"; // Ensure the active tab section is displayed
  }

  // Set up default tab (first tab, collection)
  switchTab("collection");

  tabButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const tabId = event.target.id.replace("tab-", "");
      switchTab(tabId);
    });
  });

  // Handle the clicker button click event
  clickerButton.addEventListener("click", () => {
    coinCount += coinsPerClick;
    updateCoinCount();
    saveGameData();
  });

  // Handle the upgrade button click event
  upgradeButton.addEventListener("click", () => {
    if (coinCount >= upgradeCost) {
      coinCount -= upgradeCost;
      upgrades++;
      coinsPerClick = 1 + upgrades;
      upgradeCost = Math.floor(upgradeCost * 1.5);
      updateCoinCount();
      coinsPerClickElement.textContent = coinsPerClick;
      upgradeStatusElement.textContent = `Upgrades: ${upgrades}`;
      upgradeButton.textContent = `Upgrade (Cost: ${upgradeCost} Coins)`;
      saveGameData();
    } else {
      alert("Not enough coins to upgrade!");
    }
  });

  // Handle the gacha button click event
  gachaButton.addEventListener("click", () => {
    if (coinCount >= gachaCost) {
      coinCount -= gachaCost;
      updateCoinCount(); // Update the coin count display

      // Determine rarity of the item
      const rarity =
        gachaRarities[Math.floor(Math.random() * gachaRarities.length)];
      let item = getRandomItem(); // Get a random item to give to the player

      // If an item is obtained, update its count and save it to the inventory
      if (item) {
        item.count++; // Increase the count of the item
        collectedItems.push(item); // Optionally keep track of the collected item
        addToGachaHistory(item.name, rarity); // Add to gacha history

        // Update allItems to reflect the new count
        const existingItem = allItems.find((i) => i.name === item.name);
        if (existingItem) {
          existingItem.count = item.count; // Update existing item count in allItems
        }

        // Update the inventory display
        updateItemInventory();
      }

      // Save the updated game data
      saveGameData();
    } else {
      alert("Not enough coins for a Gacha pull!");
    }
  });

  // Handle the auto clicker button click event
  autoClickerButton.addEventListener("click", () => {
    if (coinCount >= autoClickerCost) {
      coinCount -= autoClickerCost;
      updateCoinCount();
      autoClickerActive = !autoClickerActive;

      if (autoClickerActive) {
        autoClickerInterval = setInterval(() => {
          coinCount += coinsPerClick;
          updateCoinCount();
          saveGameData(); // Save game state after each auto-click
        }, 1000);
        autoClickerStatusElement.textContent = "Active";
      } else {
        clearInterval(autoClickerInterval);
        autoClickerStatusElement.textContent = "Inactive";
      }

      saveGameData(); // Save game state whenever auto clicker is activated or deactivated
    } else {
      alert("Not enough coins to buy Auto Clicker!");
    }
  });

  // Add item to Gacha History
  function addToGachaHistory(itemName, rarity) {
    const historyEntry = `${itemName} (${rarity})`;
    gachaHistory.unshift(historyEntry);
    if (gachaHistory.length > 5) {
      gachaHistory.pop(); // Limit to last 5 pulls
    }
    updateGachaHistory();
  }

  // Update the displayed Gacha History
  function updateGachaHistory() {
    gachaHistoryElement.innerHTML =
      gachaHistory.length > 0
        ? gachaHistory.map((entry) => `<li>${entry}</li>`).join("")
        : "<li>No pulls yet...</li>";
  }

  // Update the item inventory
  function updateItemInventory() {
    itemInventoryElement.innerHTML = ""; // Clear current inventory display

    // Loop through all items and display their counts
    allItems.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = `${item.name} (Count: ${item.count})`;

      // Disable the item if it has reached the upgrade goal
      if (item.count >= item.upgradeGoal) {
        listItem.classList.add("disabled");
      }

      // Create and append the progress bar for each item
      const progressBar = document.createElement("div");
      progressBar.classList.add("progress-bar");
      const progressPercent = (item.count / item.upgradeGoal) * 100;
      progressBar.style.width = `${Math.min(progressPercent, 100)}%`;
      listItem.appendChild(progressBar);

      // Add the item to the inventory display
      itemInventoryElement.appendChild(listItem);
    });
  }

  // Randomly select an item to give to the player
  function getRandomItem() {
    const items = allItems.filter((item) => item.count < item.upgradeGoal); // Filter out items that have reached the upgrade goal
    return items.length > 0
      ? items[Math.floor(Math.random() * items.length)]
      : null;
  }

  // Apply item effects
  function applyItemEffect(item) {
    if (item.type === "coinMultiplier") {
      coinsPerClick *= 2;
    } else if (item.type === "upgradeBoost") {
      upgradeCost = Math.floor(upgradeCost * 0.9);
    }
  }

  // Initialize the game
  initializeGame();
});
