const TILE_SIZE = 56;
const UI_HEIGHT = 168;
const TOUCH_HEIGHT = 126;
const SHADOW_DISTANCE = 2;
const MOVE_TWEEN_MS = 120;
const BEST_SCORE_KEY_PREFIX = 'shadow-mover-best-level-';

const COLORS = {
  background: 0x12151f,
  floor: 0x20283a,
  floorAlt: 0x252f43,
  wall: 0x6f7988,
  wallTop: 0x98a2b3,
  player: 0xf5c542,
  playerStroke: 0x8d6410,
  shadow: 0x222532,
  shadowStroke: 0x98a6c7,
  box: 0xc47a3a,
  boxStroke: 0x6f3d1b,
  target: 0x65d68b,
  panel: 0x0c1018,
  button: 0x2f3a52,
  buttonStroke: 0x8fa1bd,
  text: '#f6f1e8',
  muted: '#aeb7c7',
  warning: '#ffd166',
};

const LIGHT_DIRECTIONS = {
  left: { label: '左侧', shadowOffset: { x: SHADOW_DISTANCE, y: 0 } },
  right: { label: '右侧', shadowOffset: { x: -SHADOW_DISTANCE, y: 0 } },
  up: { label: '上方', shadowOffset: { x: 0, y: SHADOW_DISTANCE } },
  down: { label: '下方', shadowOffset: { x: 0, y: -SHADOW_DISTANCE } },
};

// 地图字符说明：
// # = 墙，. = 地面，P = 玩家起点，B = 箱子，T = 目标点。
// 每关通过 lightDirection 控制光源方向，从而改变影子相对玩家的位置。
const LEVELS = [
  {
    name: '第 1 关：左光入门',
    description: '光源在左侧，影子会出现在玩家右侧。向右移动，用影子推动箱子。',
    maxSteps: 6,
    lightDirection: 'left',
    map: [
      '############',
      '#..........#',
      '#..........#',
      '#..P..B.T..#',
      '#..........#',
      '#..........#',
      '#..........#',
      '############',
    ],
  },
  {
    name: '第 2 关：上光下影',
    description: '光源在上方，影子会出现在玩家下方。向下移动可以推箱子。',
    maxSteps: 8,
    lightDirection: 'up',
    map: [
      '############',
      '#.....P....#',
      '#..........#',
      '#..........#',
      '#.....B....#',
      '#..........#',
      '#.....T....#',
      '############',
    ],
  },
  {
    name: '第 3 关：右光反推',
    description: '光源在右侧，影子会出现在玩家左侧。试着从右往左搬运。',
    maxSteps: 8,
    lightDirection: 'right',
    map: [
      '############',
      '#..........#',
      '#..........#',
      '#..T.B..P..#',
      '#..........#',
      '#..........#',
      '#..........#',
      '############',
    ],
  },
  {
    name: '第 4 关：下光上影',
    description: '光源在下方，影子会出现在玩家上方。利用上方影子把箱子推上去。',
    maxSteps: 9,
    lightDirection: 'down',
    map: [
      '############',
      '#.....T....#',
      '#..........#',
      '#.....B....#',
      '#..........#',
      '#..........#',
      '#....#P#...#',
      '############',
    ],
  },
  {
    name: '第 5 关：换向搬运',
    description: '回到左侧光源，先对位，再改变移动方向完成最后一箱。',
    maxSteps: 14,
    lightDirection: 'left',
    map: [
      '############',
      '#..........#',
      '#..P.......#',
      '#.....B....#',
      '#..........#',
      '#......T...#',
      '#...###....#',
      '############',
    ],
  },
];

class ShadowMoverScene extends Phaser.Scene {
  constructor() {
    super('ShadowMoverScene');
    this.levelIndex = 0;
    this.gameState = 'start';
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      R: Phaser.Input.Keyboard.KeyCodes.R,
      Z: Phaser.Input.Keyboard.KeyCodes.Z,
      C: Phaser.Input.Keyboard.KeyCodes.C,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      ENTER: Phaser.Input.Keyboard.KeyCodes.ENTER,
      ONE: Phaser.Input.Keyboard.KeyCodes.ONE,
      TWO: Phaser.Input.Keyboard.KeyCodes.TWO,
      THREE: Phaser.Input.Keyboard.KeyCodes.THREE,
      FOUR: Phaser.Input.Keyboard.KeyCodes.FOUR,
      FIVE: Phaser.Input.Keyboard.KeyCodes.FIVE,
    });

    this.graphics = this.add.graphics();
    this.createUiText();
    this.createTouchControls();
    this.createMessageLayer();

    this.loadLevel(0);
    this.showStart();
  }

  update() {
    if (this.isAnimating) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.restartCurrentLevel();
      return;
    }

    if (this.gameState === 'start') {
      this.handleStartInput();
      return;
    }

    if (this.gameState === 'levelWon') {
      this.goNextLevelOnConfirm();
      return;
    }

    if (this.gameState === 'complete') {
      this.handleCompleteInput();
      return;
    }

    if (this.gameState !== 'playing') {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.Z)) {
      this.undoLastMove();
      return;
    }

    const move = this.readMoveInput();
    if (move) {
      this.tryMovePlayer(move.x, move.y);
    }
  }

  createUiText() {
    this.titleText = this.add.text(24, 12, '', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '19px',
      color: COLORS.text,
    });

    this.descriptionText = this.add.text(24, 42, '', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: COLORS.muted,
      wordWrap: { width: 624 },
    });

    this.statsText = this.add.text(24, 72, '', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: COLORS.text,
      lineSpacing: 6,
      wordWrap: { width: 624 },
    });

    this.helpText = this.add.text(24, 128, '', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '13px',
      color: COLORS.muted,
      wordWrap: { width: 624 },
    });
  }

  createMessageLayer() {
    this.messagePanel = this.add.rectangle(0, 0, 1, 1, COLORS.panel, 0.92).setDepth(20);
    this.messageTitle = this.add.text(0, 0, '', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '32px',
      color: COLORS.text,
      align: 'center',
    }).setDepth(21);
    this.messageBody = this.add.text(0, 0, '', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: COLORS.muted,
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: 590 },
    }).setDepth(21);
  }

  createTouchControls() {
    const boardBottom = UI_HEIGHT + LEVELS[0].map.length * TILE_SIZE;
    const centerX = (LEVELS[0].map[0].length * TILE_SIZE) / 2;
    const topY = boardBottom + 20;
    const size = 42;
    const gap = 8;

    this.add.text(24, boardBottom + 14, '触控按钮：移动', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '13px',
      color: COLORS.muted,
    }).setDepth(6);

    this.makeTouchButton(centerX, topY, size, '上', 0, -1);
    this.makeTouchButton(centerX, topY + size + gap, size, '下', 0, 1);
    this.makeTouchButton(centerX - size - gap, topY + size + gap, size, '左', -1, 0);
    this.makeTouchButton(centerX + size + gap, topY + size + gap, size, '右', 1, 0);
  }

  makeTouchButton(x, y, size, label, dx, dy) {
    const button = this.add.rectangle(x, y, size, size, COLORS.button, 0.9)
      .setStrokeStyle(2, COLORS.buttonStroke, 0.9)
      .setInteractive({ useHandCursor: true })
      .setDepth(6);
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '17px',
      color: COLORS.text,
    }).setOrigin(0.5).setDepth(7);

    button.on('pointerdown', () => {
      this.handleMoveRequest(dx, dy);
    });

    button.on('pointerover', () => button.setFillStyle(COLORS.buttonStroke, 0.9));
    button.on('pointerout', () => button.setFillStyle(COLORS.button, 0.9));
    return { button, text };
  }

  readMoveInput() {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) return { x: -1, y: 0 };
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) return { x: 1, y: 0 };
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) return { x: 0, y: -1 };
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) return { x: 0, y: 1 };
    return null;
  }

  handleMoveRequest(dx, dy) {
    if (this.gameState !== 'playing' || this.isAnimating) {
      return;
    }
    this.tryMovePlayer(dx, dy);
  }

  handleStartInput() {
    if (this.clearConfirmPending) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
        this.clearBestRecords();
        this.clearConfirmPending = false;
        this.showStart('最佳记录已清除。');
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
        this.clearConfirmPending = false;
        this.showStart('已取消清除。');
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
      this.clearConfirmPending = true;
      this.showMessage('清除最佳记录？', '再按一次 C 确认清除。\n按 Esc 取消。\n\n只会清除本游戏保存的最佳步数。');
      return;
    }

    const selectedLevel = this.readLevelNumberInput();
    if (selectedLevel !== null) {
      this.startLevel(selectedLevel);
      return;
    }

    if (this.isConfirmPressed()) {
      this.startLevel(0);
    }
  }

  handleCompleteInput() {
    const selectedLevel = this.readLevelNumberInput();
    if (selectedLevel !== null) {
      this.startLevel(selectedLevel);
    }
  }

  readLevelNumberInput() {
    const numberKeys = [this.keys.ONE, this.keys.TWO, this.keys.THREE, this.keys.FOUR, this.keys.FIVE];
    for (let i = 0; i < numberKeys.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(numberKeys[i])) {
        return i;
      }
    }
    return null;
  }

  startLevel(index) {
    this.levelIndex = index;
    this.loadLevel(index);
    this.gameState = 'playing';
    this.clearConfirmPending = false;
    this.hideMessage();
    this.draw();
  }

  goNextLevelOnConfirm() {
    if (!this.isConfirmPressed()) {
      return;
    }

    this.levelIndex += 1;
    if (this.levelIndex >= LEVELS.length) {
      this.showComplete();
      return;
    }

    this.startLevel(this.levelIndex);
  }

  isConfirmPressed() {
    return Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER);
  }

  restartCurrentLevel() {
    if (this.gameState === 'complete') {
      this.levelIndex = 0;
    }

    this.startLevel(this.levelIndex);
  }

  loadLevel(index) {
    const level = LEVELS[index];
    this.level = {
      name: level.name,
      description: level.description,
      maxSteps: level.maxSteps,
      lightDirection: level.lightDirection,
      width: level.map[0].length,
      height: level.map.length,
      walls: new Set(),
      targets: new Set(),
    };

    this.box = null;
    this.player = null;
    this.stepsUsed = 0;
    this.stepsLeft = level.maxSteps;
    this.deadlockHintShown = false;
    this.undoStack = [];
    this.isAnimating = false;
    this.targetFlash = 0;
    this.lastBestWasUpdated = false;

    level.map.forEach((row, y) => {
      [...row].forEach((tile, x) => {
        if (tile === '#') this.level.walls.add(this.keyOf(x, y));
        if (tile === 'T') this.level.targets.add(this.keyOf(x, y));
        if (tile === 'B') this.box = { x, y };
        if (tile === 'P') this.player = { x, y };
      });
    });

    this.visualPlayer = { ...this.player };
    this.visualBox = { ...this.box };
    this.draw();
  }

  tryMovePlayer(dx, dy) {
    const nextPlayer = { x: this.player.x + dx, y: this.player.y + dy };

    // 核心规则：玩家本体永远不能推动箱子，只能让影子推动。
    if (this.isWall(nextPlayer.x, nextPlayer.y) || this.isSameCell(nextPlayer, this.box)) {
      this.flashHint('玩家本人不能推动箱子，要让影子碰到箱子。');
      return;
    }

    const nextShadow = this.getShadowFor(nextPlayer);
    const oldPlayer = { ...this.player };
    const oldBox = { ...this.box };
    let nextBox = { ...this.box };
    let boxMoved = false;

    if (this.isSameCell(nextShadow, this.box)) {
      const pushedBox = { x: this.box.x + dx, y: this.box.y + dy };
      const blockedByPlayer = this.isSameCell(pushedBox, nextPlayer);

      if (this.isWall(pushedBox.x, pushedBox.y) || blockedByPlayer) {
        this.flashHint('影子推不动被墙挡住的箱子。');
        return;
      }

      nextBox = pushedBox;
      boxMoved = true;
    }

    this.saveUndoState();
    this.player = nextPlayer;
    this.box = nextBox;
    this.stepsUsed += 1;
    this.stepsLeft -= 1;

    this.animateMove(oldPlayer, nextPlayer, oldBox, nextBox, boxMoved);
  }

  animateMove(oldPlayer, nextPlayer, oldBox, nextBox, boxMoved) {
    this.isAnimating = true;
    const progress = { t: 0 };

    this.tweens.add({
      targets: progress,
      t: 1,
      duration: MOVE_TWEEN_MS,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.visualPlayer = this.lerpCell(oldPlayer, nextPlayer, progress.t);
        this.visualBox = boxMoved ? this.lerpCell(oldBox, nextBox, progress.t) : { ...nextBox };
        this.draw();
      },
      onComplete: () => {
        this.visualPlayer = { ...nextPlayer };
        this.visualBox = { ...nextBox };
        this.isAnimating = false;
        this.draw();
        this.finishMove();
      },
    });
  }

  finishMove() {
    if (this.isBoxOnTarget()) {
      this.gameState = 'levelWon';
      this.lastBestWasUpdated = this.updateBestSteps();
      this.playTargetFlash(() => this.showLevelWon());
      return;
    }

    if (this.stepsLeft <= 0) {
      this.gameState = 'failed';
      this.showFailed();
      return;
    }

    this.checkSimpleDeadlock();
  }

  lerpCell(from, to, t) {
    return {
      x: Phaser.Math.Linear(from.x, to.x, t),
      y: Phaser.Math.Linear(from.y, to.y, t),
    };
  }

  saveUndoState() {
    // 保存移动前状态，Z 键可回到上一步。
    this.undoStack.push({
      player: { ...this.player },
      box: { ...this.box },
      stepsLeft: this.stepsLeft,
      stepsUsed: this.stepsUsed,
      deadlockHintShown: this.deadlockHintShown,
    });
  }

  undoLastMove() {
    if (this.undoStack.length === 0) {
      this.flashHint('没有可以撤销的步骤。');
      return;
    }

    const previous = this.undoStack.pop();
    this.player = { ...previous.player };
    this.box = { ...previous.box };
    this.visualPlayer = { ...previous.player };
    this.visualBox = { ...previous.box };
    this.stepsLeft = previous.stepsLeft;
    this.stepsUsed = previous.stepsUsed;
    this.deadlockHintShown = previous.deadlockHintShown;
    this.draw();
    this.flashHint('已撤销一步。');
  }

  checkSimpleDeadlock() {
    if (this.deadlockHintShown || this.isBoxOnTarget()) {
      return;
    }

    // 简单死局判断：箱子同时贴着一面横向墙和一面纵向墙时，很可能卡在墙角。
    const blockedLeft = this.isWall(this.box.x - 1, this.box.y);
    const blockedRight = this.isWall(this.box.x + 1, this.box.y);
    const blockedUp = this.isWall(this.box.x, this.box.y - 1);
    const blockedDown = this.isWall(this.box.x, this.box.y + 1);
    const inCorner = (blockedLeft || blockedRight) && (blockedUp || blockedDown);

    if (inCorner) {
      this.deadlockHintShown = true;
      this.flashHint('箱子可能卡死了，按 R 重开。', 1800);
    }
  }

  draw() {
    this.graphics.clear();
    this.drawBoard();
    this.drawTarget();
    this.drawBox();
    this.drawPlayer();
    this.drawShadow();
    this.drawUi();
  }

  drawBoard() {
    for (let y = 0; y < this.level.height; y += 1) {
      for (let x = 0; x < this.level.width; x += 1) {
        const px = x * TILE_SIZE;
        const py = UI_HEIGHT + y * TILE_SIZE;
        const isWall = this.isWall(x, y);
        const fill = isWall ? COLORS.wall : (x + y) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;

        this.graphics.fillStyle(fill, 1);
        this.graphics.fillRoundedRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4, 6);

        if (isWall) {
          this.graphics.fillStyle(COLORS.wallTop, 0.45);
          this.graphics.fillRoundedRect(px + 8, py + 8, TILE_SIZE - 16, 8, 4);
        }
      }
    }

    this.drawLight();
  }

  drawLight() {
    const boardWidth = this.level.width * TILE_SIZE;
    const boardHeight = this.level.height * TILE_SIZE;
    const midX = boardWidth / 2;
    const midY = UI_HEIGHT + boardHeight / 2;
    const inset = 18;
    let source = { x: inset, y: midY };
    let rayEnds = [];

    if (this.level.lightDirection === 'left') {
      source = { x: inset, y: midY };
      rayEnds = [-2, -1, 0, 1, 2].map((i) => ({ x: source.x + 88, y: source.y + i * 28 }));
    } else if (this.level.lightDirection === 'right') {
      source = { x: boardWidth - inset, y: midY };
      rayEnds = [-2, -1, 0, 1, 2].map((i) => ({ x: source.x - 88, y: source.y + i * 28 }));
    } else if (this.level.lightDirection === 'up') {
      source = { x: midX, y: UI_HEIGHT + inset };
      rayEnds = [-2, -1, 0, 1, 2].map((i) => ({ x: source.x + i * 28, y: source.y + 88 }));
    } else if (this.level.lightDirection === 'down') {
      source = { x: midX, y: UI_HEIGHT + boardHeight - inset };
      rayEnds = [-2, -1, 0, 1, 2].map((i) => ({ x: source.x + i * 28, y: source.y - 88 }));
    }

    this.graphics.fillStyle(0xffe38a, 1);
    this.graphics.fillCircle(source.x, source.y, 14);
    this.graphics.lineStyle(2, 0xffe38a, 0.25);
    rayEnds.forEach((end) => this.graphics.lineBetween(source.x, source.y, end.x, end.y));
  }

  drawTarget() {
    this.level.targets.forEach((targetKey) => {
      const { x, y } = this.cellFromKey(targetKey);
      const { cx, cy } = this.centerOf(x, y);
      this.graphics.lineStyle(5 + this.targetFlash * 8, COLORS.target, 1);
      this.graphics.strokeCircle(cx, cy, 16 + this.targetFlash * 5);
      this.graphics.lineStyle(2, 0xffffff, 0.35);
      this.graphics.strokeCircle(cx, cy, 24);
    });
  }

  drawPlayer() {
    const position = this.visualPlayer || this.player;
    const { cx, cy } = this.centerOf(position.x, position.y);
    this.graphics.fillStyle(COLORS.player, 1);
    this.graphics.lineStyle(4, COLORS.playerStroke, 1);
    this.graphics.fillCircle(cx, cy, 17);
    this.graphics.strokeCircle(cx, cy, 17);
    this.graphics.fillStyle(0xffffff, 0.7);
    this.graphics.fillCircle(cx - 6, cy - 6, 4);
  }

  drawShadow() {
    const shadow = this.getShadowFor(this.visualPlayer || this.player);
    const { cx, cy } = this.centerOf(shadow.x, shadow.y);
    const blocked = this.isWall(Math.round(shadow.x), Math.round(shadow.y));
    this.graphics.fillStyle(COLORS.shadow, blocked ? 0.42 : 0.82);
    this.graphics.lineStyle(3, COLORS.shadowStroke, blocked ? 0.35 : 0.75);
    this.graphics.fillEllipse(cx, cy, 39, 27);
    this.graphics.strokeEllipse(cx, cy, 39, 27);
  }

  drawBox() {
    const position = this.visualBox || this.box;
    const { cx, cy } = this.centerOf(position.x, position.y);
    this.graphics.fillStyle(COLORS.box, 1);
    this.graphics.lineStyle(4, COLORS.boxStroke, 1);
    this.graphics.fillRoundedRect(cx - 19, cy - 19, 38, 38, 5);
    this.graphics.strokeRoundedRect(cx - 19, cy - 19, 38, 38, 5);
    this.graphics.lineStyle(2, 0xffd2a2, 0.5);
    this.graphics.lineBetween(cx - 11, cy, cx + 11, cy);
    this.graphics.lineBetween(cx, cy - 11, cx, cy + 11);
  }

  drawUi() {
    const shadow = this.getShadowFor(this.player);
    const bestText = this.getBestStepsText();
    this.titleText.setText(`影子搬运工  ${this.level.name}`);
    this.descriptionText.setText(this.level.description);
    this.statsText.setText(
      `光源方向：${this.getLightDirectionLabel()}  |  剩余：${this.stepsLeft}/${this.level.maxSteps}  |  已用：${this.stepsUsed}  |  ${bestText}\n` +
        `玩家：(${this.player.x}, ${this.player.y})  |  影子：(${shadow.x}, ${shadow.y})`
    );
    this.helpText.setText(
      '方向键 / 触控按钮：移动 | Z：撤销一步 | R：重开 | Space / Enter：开始或下一关 | C：清除最佳记录'
    );
  }

  showStart(note = '') {
    this.gameState = 'start';
    const noteText = note ? `\n\n${note}` : '';
    this.showMessage(
      '影子搬运工',
      '玩家不能直接推箱子，影子才能推箱子。\n不同关卡的光源方向会改变影子位置。\n在有限步数内，把箱子推到绿色目标点。\n\n按 Space 或 Enter 从第 1 关开始\n按数字键 1-5 直接选择关卡\n按 C 清除最佳记录' + noteText
    );
  }

  showLevelWon() {
    const isLastLevel = this.levelIndex === LEVELS.length - 1;
    const bestLine = this.lastBestWasUpdated ? '刷新了当前关卡最佳记录。' : this.getBestStepsText();
    this.showMessage(
      '搬运成功',
      isLastLevel
        ? `本关用了 ${this.stepsUsed} 步。\n${bestLine}\n按 Space 或 Enter 查看完成界面`
        : `本关用了 ${this.stepsUsed} 步。\n${bestLine}\n按 Space 或 Enter 进入下一关`
    );
  }

  showFailed() {
    this.showMessage('搬运失败', '步数用完，搬运失败。\n按 R 重开当前关卡。');
  }

  showComplete() {
    this.gameState = 'complete';
    this.showMessage(
      '全部关卡完成',
      `已完成全部 ${LEVELS.length} 个关卡。\n按 R 从第一关重新开始。\n也可以按数字键 1-5 选择关卡。`
    );
  }

  showMessage(title, body) {
    const width = this.scale.width;
    const height = this.scale.height;
    this.messagePanel.setPosition(width / 2, height / 2);
    this.messagePanel.setSize(width, height);
    this.messagePanel.setVisible(true);

    this.messageTitle.setText(title);
    this.messageTitle.setPosition(width / 2, height / 2 - 120);
    this.messageTitle.setOrigin(0.5);
    this.messageTitle.setVisible(true);

    this.messageBody.setText(body);
    this.messageBody.setPosition(width / 2, height / 2 - 56);
    this.messageBody.setOrigin(0.5, 0);
    this.messageBody.setVisible(true);
  }

  hideMessage() {
    this.messagePanel.setVisible(false);
    this.messageTitle.setVisible(false);
    this.messageBody.setVisible(false);
  }

  flashHint(message, duration = 900) {
    this.helpText.setText(message);
    this.helpText.setColor(COLORS.warning);
    this.time.delayedCall(duration, () => {
      this.helpText.setColor(COLORS.muted);
      this.drawUi();
    });
  }

  playTargetFlash(onComplete) {
    const flash = { value: 1 };
    this.targetFlash = 1;
    this.isAnimating = true;
    this.tweens.add({
      targets: flash,
      value: 0,
      duration: 180,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.targetFlash = flash.value;
        this.draw();
      },
      onComplete: () => {
        this.targetFlash = 0;
        this.isAnimating = false;
        this.draw();
        onComplete();
      },
    });
  }

  updateBestSteps() {
    const previousBest = this.getBestSteps();
    if (previousBest === null || this.stepsUsed < previousBest) {
      this.setBestSteps(this.stepsUsed);
      return true;
    }
    return false;
  }

  getBestStepsText() {
    const best = this.getBestSteps();
    return best === null ? '最佳：暂无' : `最佳：${best} 步`;
  }

  getBestSteps() {
    try {
      const saved = localStorage.getItem(this.getBestStepsKey());
      return saved === null ? null : Number(saved);
    } catch (error) {
      return null;
    }
  }

  setBestSteps(steps) {
    try {
      localStorage.setItem(this.getBestStepsKey(), String(steps));
    } catch (error) {
      // 如果浏览器禁用 localStorage，游戏仍然可以正常游玩。
    }
  }

  clearBestRecords() {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(BEST_SCORE_KEY_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      // 清除失败时不影响正常游玩。
    }
  }

  getBestStepsKey() {
    return `${BEST_SCORE_KEY_PREFIX}${this.levelIndex + 1}`;
  }

  getLightDirectionLabel() {
    return LIGHT_DIRECTIONS[this.level.lightDirection].label;
  }

  getShadowFor(position) {
    const offset = LIGHT_DIRECTIONS[this.level.lightDirection].shadowOffset;
    return {
      x: position.x + offset.x,
      y: position.y + offset.y,
    };
  }

  centerOf(x, y) {
    return {
      cx: x * TILE_SIZE + TILE_SIZE / 2,
      cy: UI_HEIGHT + y * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  isBoxOnTarget() {
    return this.level.targets.has(this.keyOf(this.box.x, this.box.y));
  }

  isWall(x, y) {
    return (
      x < 0 ||
      y < 0 ||
      x >= this.level.width ||
      y >= this.level.height ||
      this.level.walls.has(this.keyOf(x, y))
    );
  }

  isSameCell(a, b) {
    return a && b && a.x === b.x && a.y === b.y;
  }

  keyOf(x, y) {
    return `${x},${y}`;
  }

  cellFromKey(key) {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: TILE_SIZE * 12,
  height: UI_HEIGHT + TILE_SIZE * 8 + TOUCH_HEIGHT,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: ShadowMoverScene,
};

new Phaser.Game(config);
