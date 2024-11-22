// clickerGame.js
class ClickerGame {
  constructor() {
    // Game State Variables
    this.coinCount = 0;
    this.coinsPerClick = 1;
    this.upgrades = 0;
    this.upgradeCost = 10;
    this.gachaCost = 20;
    this.autoClickerCost = 100;
    this.autoClickerActive = false;
    this.autoClickerInterval = null;
    this.lastClaimedDate = null;
    this.gachaHistory = [];
    this.gachaRarities = ["Common", "Rare", "Epic"];
    this.collectedItems = [];
    this.allItems = [];
    this.achievements = [];
    this.shopItems = [];
    this.randomEvents = [];
    this.totalClicks = 0;
    this.totalGachaPulls = 0;
    this.prestigeLevel = 0;
    this.prestigeMultiplier = 1;
    this.autoClickerEfficiency = 0;

    // Database
    this.dbName = "gameStateDB";
    this.db = null;

    // UI Elements
    this.coinCountElement = document.getElementById("coin-count");
    this.clickerButton = document.getElementById("clicker-button");
    this.upgradeButton = document.getElementById("upgrade-button");
    this.gachaButton = document.getElementById("gacha-button");
    this.autoClickerButton = document.getElementById("auto-clicker-button");
    this.coinsPerClickElement = document.getElementById("coins-per-click");
    this.upgradeStatusElement = document.getElementById("upgrade-status");
    this.gachaHistoryElement = document.getElementById("gacha-history");
    this.itemInventoryElement = document.getElementById("item-inventory");
    this.autoClickerStatusElement = document.getElementById("auto-clicker-status");
    this.upgradeCostElement = document.getElementById("upgrade-cost");
    this.tabButtons = document.querySelectorAll(".tab-button");
    this.tabSections = document.querySelectorAll(".tab-section");
    this.achievementsListElement = document.getElementById("achievements-list");
    this.prestigeButton = document.getElementById("prestige-button");
    this.shopItemsElement = document.getElementById("shop-items");
  }

  async initializeGame() {
    await this.loadItems();
    await this.loadAchievements();
    await this.loadShopItems();
    await this.loadRandomEvents();
    await this.openDB();
    this.loadGameData();
    this.addEventListeners();
    this.switchTab("collection");
    this.startRandomEvents();
    this.checkDailyReward();
  }

  async loadItems() {
    try {
      const response = await fetch("./items.json");
      this.allItems = await response.json();
    } catch (error) {
      console.error("Error loading items:", error);
    }
  }

  async loadAchievements() {
    try {
      const response = await fetch("./achievements.json");
      this.achievements = await response.json();
    } catch (error) {
      console.error("Error loading achievements:", error);
    }
  }

  async loadShopItems() {
    try {
      const response = await fetch("./shopItems.json");
      this.shopItems = await response.json();
    } catch (error) {
      console.error("Error loading shop items:", error);
    }
  }

  async loadRandomEvents() {
    try {
      const response = await fetch("./randomEvents.json");
      this.randomEvents = await response.json();
    } catch (error) {
      console.error("Error loading random events:", error);
    }
  }

  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        this.db = request.result;
        if (!this.db.objectStoreNames.contains("gameData")) {
          this.db.createObjectStore("gameData", { keyPath: "id" });
        }
      };
      request.onerror = () => reject("Error opening IndexedDB");
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
    });
  }

  saveGameData() {
    const transaction = this.db.transaction(["gameData"], "readwrite");
    const store = transaction.objectStore("gameData");
    const gameState = {
      id: 1,
      coinCount: this.coinCount,
      coinsPerClick: this.coinsPerClick,
      upgrades: this.upgrades,
      upgradeCost: this.upgradeCost,
      gachaCost: this.gachaCost,
      autoClickerCost: this.autoClickerCost,
      autoClickerActive: this.autoClickerActive,
      gachaHistory: this.gachaHistory,
      collectedItems: this.collectedItems,
      allItems: this.allItems,
      achievements: this.achievements,
      totalClicks: this.totalClicks,
      totalGachaPulls: this.totalGachaPulls,
      lastClaimedDate: this.lastClaimedDate,
      prestigeLevel: this.prestigeLevel,
      prestigeMultiplier: this.prestigeMultiplier,
    };
    store.put(gameState);
  }

  loadGameData() {
    const transaction = this.db.transaction(["gameData"], "readonly");
    const store = transaction.objectStore("gameData");
    const request = store.get(1);
    request.onsuccess = (e) => {
      const gameState = e.target.result;
      if (gameState) {
        Object.assign(this, gameState);
        this.applyItemBonuses();
        this.updateUI();
        if (this.autoClickerActive) {
          this.startAutoClicker();
        }
        this.updateAchievementsUI();
        this.updateShopUI();
      }
    };
    request.onerror = () => console.log("Error loading game data from IndexedDB");
  }

  applyItemBonuses() {
    // Reset bonuses
    this.coinsPerClick = (1 + this.upgrades) * this.prestigeMultiplier;
    this.autoClickerEfficiency = 0;

    // Apply bonuses from collected items
    this.collectedItems.forEach((item) => {
      switch (item.type) {
        case "coinMultiplier":
          this.coinsPerClick += item.level * 2;
          break;
        case "autoClickerBoost":
          this.autoClickerEfficiency += item.level;
          break;
        case "upgradeBoost":
          const upgradeBoostFactor = 1 - item.level * 0.05;
          this.upgradeCost = Math.floor(this.upgradeCost * upgradeBoostFactor);
          break;
        default:
          break;
      }
    });
  }

  addEventListeners() {
    window.addEventListener("beforeunload", () => this.saveGameData());

    this.clickerButton.addEventListener("click", () => {
      this.coinCount += this.coinsPerClick;
      this.updateCoinCount();
      this.totalClicks++;
      this.checkAchievements();
      this.saveGameData();
    });

    this.upgradeButton.addEventListener("click", () => this.upgrade());
    this.gachaButton.addEventListener("click", () => this.performGacha());
    this.autoClickerButton.addEventListener("click", () => this.toggleAutoClicker());
    this.prestigeButton.addEventListener("click", () => this.prestige());

    this.tabButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        const tabId = event.target.id.replace("tab-", "");
        this.switchTab(tabId);
      });
    });
  }

  upgrade() {
    if (this.coinCount >= this.upgradeCost) {
      this.coinCount -= this.upgradeCost;
      this.upgrades++;
      this.applyItemBonuses();
      this.upgradeCost = Math.floor(this.upgradeCost * 1.5);
      this.updateUI();
      this.saveGameData();
    } else {
      alert("Not enough coins to upgrade!");
    }
  }

  performGacha() {
    if (this.coinCount >= this.gachaCost) {
      this.coinCount -= this.gachaCost;
      const rarity = this.getRandomRarity();
      const item = this.getRandomItem(rarity);
      if (item) {
        this.incrementItemExperience(item);
        this.totalGachaPulls++;
        this.gachaHistory.unshift({ item: item.name, rarity });
        if (this.gachaHistory.length > 10) this.gachaHistory.pop();
        this.applyItemBonuses();
        this.updateUI();
        this.checkAchievements();
      }
      this.saveGameData();
    } else {
      alert("Not enough coins for a Gacha pull!");
    }
  }

  incrementItemExperience(item) {
    if (!item.experience) item.experience = 0;
    if (!item.level) item.level = 1;
    item.experience += 1;
    const experienceNeeded = item.level * 5;
    if (item.experience >= experienceNeeded) {
      item.level += 1;
      item.experience = 0;
      alert(`${item.name} has leveled up to Level ${item.level}!`);
    }
  }

  toggleAutoClicker() {
    if (this.coinCount >= this.autoClickerCost) {
      this.coinCount -= this.autoClickerCost;
      this.autoClickerActive = !this.autoClickerActive;
      this.autoClickerActive ? this.startAutoClicker() : this.stopAutoClicker();
      this.updateUI();
      this.saveGameData();
    } else {
      alert("Not enough coins to buy Auto-Clicker!");
    }
  }

  startAutoClicker() {
    this.autoClickerInterval = setInterval(() => {
      this.coinCount += this.coinsPerClick + this.autoClickerEfficiency;
      this.updateCoinCount();
      this.saveGameData();
    }, 1000);
    this.autoClickerStatusElement.textContent = "Active";
  }

  stopAutoClicker() {
    clearInterval(this.autoClickerInterval);
    this.autoClickerStatusElement.textContent = "Inactive";
  }

  prestige() {
    if (this.coinCount >= 100000) {
      const confirmPrestige = confirm(
        "Prestiging will reset your progress but grant a permanent bonus. Proceed?"
      );
      if (confirmPrestige) {
        this.prestigeLevel++;
        this.prestigeMultiplier = 1 + this.prestigeLevel * 0.5;
        this.resetGame();
        alert(`You have prestiged! Prestige Level: ${this.prestigeLevel}`);
      }
    } else {
      alert("You need at least 100,000 coins to prestige.");
    }
  }

  resetGame() {
    this.coinCount = 0;
    this.upgrades = 0;
    this.upgradeCost = 10;
    this.autoClickerCost = 100;
    this.autoClickerActive = false;
    clearInterval(this.autoClickerInterval);
    this.gachaHistory = [];
    this.collectedItems = [];
    this.allItems.forEach((item) => {
      item.count = 0;
      item.level = 1;
      item.experience = 0;
    });
    this.totalClicks = 0;
    this.totalGachaPulls = 0;
    this.applyItemBonuses();
    this.updateUI();
    this.saveGameData();
  }

  updateAchievementsUI() {
    this.achievementsListElement.innerHTML = this.achievements
      .map(
        (achievement) => `
          <li>
            ${achievement.name} - ${achievement.achieved ? "Unlocked ✅" : "Locked 🔒"}
            <p>${achievement.description}</p>
          </li>
        `
      )
      .join("");
  }

  updateUI() {
    this.updateCoinCount();
    this.coinsPerClickElement.textContent = `Coins per click: ${this.coinsPerClick}`;
    this.upgradeStatusElement.textContent = `Upgrades: ${this.upgrades}`;
    this.upgradeCostElement.textContent = `Next upgrade cost: ${this.upgradeCost} coins`;
    this.updateGachaHistory();
    this.updateItemInventory();
    this.updateAchievementsUI();
  }

  updateCoinCount() {
    this.coinCountElement.textContent = `Coins: ${this.coinCount}`;
    this.coinCountElement.classList.add("increase");
    setTimeout(() => {
      this.coinCountElement.classList.remove("increase");
    }, 200);
  }

  checkAchievements() {
    this.achievements.forEach((achievement) => {
      if (!achievement.achieved) {
        if (this[achievement.type] >= achievement.target) {
          achievement.achieved = true;
          alert(`Achievement Unlocked: ${achievement.name}\n${achievement.description}`);
          this.updateAchievementsUI();
          this.saveGameData();
        }
      }
    });
  }

  updateGachaHistory() {
    this.gachaHistoryElement.innerHTML = this.gachaHistory
      .map((entry) => `<li>${entry.item} (${entry.rarity})</li>`)
      .join("");
  }

  updateItemInventory() {
    this.itemInventoryElement.innerHTML = this.allItems
      .filter((item) => item.level > 0)
      .map(
        (item) => `<li>${item.name} - Level ${item.level} (EXP: ${item.experience}/${item.level * 5})</li>`
      )
      .join("");
  }

  getRandomRarity() {
    const weights = { Common: 0.7, Rare: 0.25, Epic: 0.05 };
    const random = Math.random();
    let sum = 0;
    for (let rarity in weights) {
      sum += weights[rarity];
      if (random <= sum) return rarity;
    }
    return "Common";
  }

  getRandomItem(rarity) {
    const itemsByRarity = this.allItems.filter((item) => item.rarity === rarity);
    return itemsByRarity[Math.floor(Math.random() * itemsByRarity.length)];
  }

  switchTab(tabId) {
    this.tabButtons.forEach((button) => button.classList.remove("active"));
    this.tabSections.forEach((section) => {
      section.classList.remove("active");
      section.style.display = "none";
    });

    document.getElementById(`tab-${tabId}`).classList.add("active");
    const activeTabSection = document.getElementById(`${tabId}-section`);
    activeTabSection.classList.add("active");
    activeTabSection.style.display = "block";
  }

  checkDailyReward() {
    const today = new Date().toDateString();
    if (this.lastClaimedDate !== today) {
      this.lastClaimedDate = today;
      const dailyReward = 100 * this.prestigeMultiplier;
      this.coinCount += dailyReward;
      alert(`Daily Reward: You've received ${dailyReward} coins!`);
      this.updateCoinCount();
      this.saveGameData();
    }
  }

  startRandomEvents() {
    setInterval(() => {
      const random = Math.random();
      this.randomEvents.forEach((event) => {
        if (random < event.probability) {
          event.effect.call(this);
          this.saveGameData();
        }
      });
    }, 60000); // Every minute
  }

  updateShopUI() {
    this.shopItemsElement.innerHTML = this.shopItems
      .map(
        (item) => `
          <li>
            ${item.name} - ${item.cost} coins
            <p>${item.description}</p>
            <button data-id="${item.id}" class="buy-button">Buy</button>
          </li>
        `
      )
      .join("");

    // Add event listeners
    document.querySelectorAll(".buy-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        const itemId = parseInt(e.target.getAttribute("data-id"));
        this.purchaseShopItem(itemId);
      });
    });
  }

  purchaseShopItem(itemId) {
    const item = this.shopItems.find((i) => i.id === itemId);
    if (this.coinCount >= item.cost) {
      this.coinCount -= item.cost;
      item.effect.call(this);
      this.updateCoinCount();
      alert(`Purchased ${item.name}!`);
      this.saveGameData();
    } else {
      alert("Not enough coins.");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const game = new ClickerGame();
  game.initializeGame();
});