import Phaser from "phaser";
import "./style.css";
import { canRescue, rescuePhase, stepTapRescue, tapPull, type RescueState } from "./game/rescuePhysics";
import { battleOutcome, rexAttack, tailStrike, type BattleState } from "./game/chapter2Physics";

type PlayerGender = "male" | "female";
const PROFILE_KEY = "trauma-player-gender";
const CHAPTER_ONE_HEALED_KEY = "trauma-chapter-1-healed";
const CHAPTER_TWO_HEALED_KEY = "trauma-chapter-2-healed";
const BONUS_DONE_KEY = "trauma-bonus-done";
const DEBUG_UNLOCK_CHAPTER_TWO = true;

class ChapterSelect extends Phaser.Scene {
  private gender: PlayerGender | null = null;
  private chapterOneHealed = false;
  private bonusDone = false;

  constructor() { super("menu"); }

  preload() {
    this.load.image("swamp", "assets/swamp-background.png");
    this.load.image("victory", "assets/childhood-healing-victory.png");
    this.load.image("artax", "assets/artax-separated-v2.png");
    this.load.image("chapter2-arena", "assets/chapter2-volcanic-arena.png");
  }

  create() {
    const { width, height } = this.scale;
    this.gender = localStorage.getItem(PROFILE_KEY) as PlayerGender | null;
    this.chapterOneHealed = localStorage.getItem(CHAPTER_ONE_HEALED_KEY) === "true";
    this.bonusDone = localStorage.getItem(BONUS_DONE_KEY) === "true";
    this.add.image(width / 2, height / 2, "swamp").setDisplaySize(width, height).setAlpha(.34);
    this.add.rectangle(width / 2, height / 2, width, height, 0x030606, .67);
    this.add.rectangle(width / 2, 76, width, 152, 0x020303, .86);

    this.add.text(42, 18, "CHILDHOOD", { fontFamily: "Arial Black", fontSize: "49px", color: "#e8e2d6", stroke: "#000", strokeThickness: 8 }).setScale(1.03, 1);
    this.add.text(407, 18, "TRAUMA", { fontFamily: "Arial Black", fontSize: "49px", color: "#cf2923", stroke: "#250000", strokeThickness: 8 });
    this.add.text(47, 78, "S I M U L A T O R", { fontFamily: "Arial Black", fontSize: "20px", color: "#d8d0c0", letterSpacing: 10 });
    this.add.text(width - 42, 38, "RELIVE IT.  RESCUE THEM.  REWRITE IT.", { fontFamily: "Georgia", fontStyle: "italic", fontSize: "22px", color: "#d8c9ad" }).setOrigin(1, 0);
    this.add.text(width - 42, 76, "CHOOSE A CHAPTER OF YOUR TRAUMA", { fontFamily: "Arial Black", fontSize: "14px", color: "#9eaaa4" }).setOrigin(1, 0);

    this.makeChapterCard(36, 174, 748, 390);
    this.makeChapterTwoCard(808, 174, 436, 390);
    this.makeChapterRail();

    const profile = this.add.text(width - 38, height - 24, this.gender ? `PROFILE: ${this.gender.toUpperCase()}  •  CHANGE` : "CHOOSE YOUR PROFILE", {
      fontFamily: "Arial Black", fontSize: "12px", color: "#d7c9aa",
    }).setOrigin(1, .5).setInteractive({ useHandCursor: true });
    profile.on("pointerdown", () => this.showGenderPrompt());
    if (!this.gender) this.showGenderPrompt();
  }

  private makeChapterCard(x: number, y: number, w: number, h: number) {
    const card = this.add.rectangle(x, y, w, h, 0x101817, .96).setOrigin(0).setStrokeStyle(3, 0xd0b16a, .9).setInteractive({ useHandCursor: true });
    const art = this.add.image(x + w * .62, y + h * .57, "artax").setDisplaySize(520, 292).setAlpha(.9);
    art.setMask(this.add.graphics().fillRect(x + 2, y + 2, w - 4, h - 4).createGeometryMask());
    this.add.rectangle(x + w / 2, y + 58, w - 4, 116, 0x020403, .74);
    this.add.text(x + 24, y + 18, "CHAPTER 1", { fontFamily: "Arial Black", fontSize: "20px", color: "#dbcaa4" });
    this.add.text(x + 24, y + 48, "SAVE ARTAX", { fontFamily: "Arial Black", fontSize: "39px", color: "#fff8e7", stroke: "#000", strokeThickness: 6 });
    this.add.text(x + 26, y + 100, "THE SWAMP OF DARKNESS", { fontFamily: "Georgia", fontSize: "18px", color: "#c9d0ca" });
    this.add.text(x + 26, y + h - 53, "CLICK TO ENTER THE MEMORY", { fontFamily: "Arial Black", fontSize: "16px", color: "#f2d993", stroke: "#000", strokeThickness: 4 });
    if (this.chapterOneHealed) {
      this.add.rectangle(x + w - 96, y + 36, 158, 42, 0x315f42, .96).setStrokeStyle(2, 0xa9dfb0, 1);
      this.add.text(x + w - 96, y + 36, "✓ HEALED", { fontFamily: "Arial Black", fontSize: "17px", color: "#dff5df" }).setOrigin(.5);
    }
    card.on("pointerover", () => card.setStrokeStyle(5, 0xffdf8b, 1));
    card.on("pointerout", () => card.setStrokeStyle(3, 0xd0b16a, .9));
    card.on("pointerdown", () => this.gender ? this.scene.start("swamp") : this.showGenderPrompt());
  }

  private makeChapterTwoCard(x: number, y: number, w: number, h: number) {
    const available = DEBUG_UNLOCK_CHAPTER_TWO || this.chapterOneHealed;
    this.add.image(x + w / 2, y + h / 2, "chapter2-arena").setDisplaySize(w, h).setAlpha(available ? .62 : .18);
    const card = this.add.rectangle(x, y, w, h, 0x050606, available ? .52 : .72).setOrigin(0).setStrokeStyle(2, available ? 0xc5a964 : 0x606663, .8);
    if (available) card.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.scene.start("chapter2"));
    this.add.text(x + 24, y + 20, "CHAPTER 2", { fontFamily: "Arial Black", fontSize: "20px", color: available ? "#d6c49b" : "#777e79" });
    this.add.text(x + 24, y + 54, available ? "MEMORY UNLOCKED" : "LOCKED MEMORY", { fontFamily: "Arial Black", fontSize: "31px", color: available ? "#eee4ce" : "#929894", stroke: "#000", strokeThickness: 5 });
    this.add.text(x + w / 2, y + h / 2 + 12, available ? "II" : "🔒", { fontFamily: "Georgia", fontStyle: "bold", fontSize: "68px", color: "#d8c084" }).setOrigin(.5);
    this.add.text(x + w / 2, y + h - 48, available ? "CLICK TO FIGHT  •  DEBUG UNLOCK" : "HEAL CHAPTER 1 TO CONTINUE", { fontFamily: "Arial Black", fontSize: "14px", color: available ? "#e2ca8e" : "#777e79" }).setOrigin(.5);
  }

  private makeChapterRail() {
    const labels = [this.chapterOneHealed ? "1. HEALED" : "1. ARTAX", "2. UNLOCKED", this.bonusDone ? "3. UNLOCKED" : "3. LOCKED", "4. LOCKED", "5. LOCKED", "6. LOCKED"];
    labels.forEach((label, i) => {
      const x = 36 + i * 202;
      this.add.rectangle(x, 584, 184, 91, i === 0 ? 0x24312e : 0x0b0e0d, .96).setOrigin(0).setStrokeStyle(i === 0 ? 4 : 2, i === 0 ? 0xc92c26 : 0x474c49, 1);
      this.add.text(x + 92, 644, label, { fontFamily: "Arial Black", fontSize: "13px", color: i === 0 ? "#f0e7d4" : "#676c69" }).setOrigin(.5);
      if (i > 0 && i !== 1 && !(i === 2 && this.bonusDone)) this.add.text(x + 92, 614, "🔒", { fontSize: "22px" }).setOrigin(.5);
      if (i === 1 || (i === 2 && this.bonusDone)) this.add.text(x + 92, 614, "✓", { fontFamily: "Arial Black", fontSize: "24px", color: "#b8dda8" }).setOrigin(.5);
    });
  }

  private showGenderPrompt() {
    const { width, height } = this.scale;
    const overlay = this.add.container(0, 0).setDepth(50);
    const block = this.add.rectangle(width / 2, height / 2, width, height, 0x010202, .86).setInteractive();
    const panel = this.add.rectangle(width / 2, height / 2, 570, 330, 0x111816, .99).setStrokeStyle(3, 0xd5c18f, .95);
    const title = this.add.text(width / 2, height / 2 - 117, "WHO IS REENTERING THE MEMORY?", { fontFamily: "Arial Black", fontSize: "24px", color: "#fff2d0" }).setOrigin(.5);
    const copy = this.add.text(width / 2, height / 2 - 66, "This tailors the healing affirmation at the end.", { fontFamily: "Georgia", fontSize: "18px", color: "#c8d0cb" }).setOrigin(.5);
    const makeChoice = (x: number, label: string, value: PlayerGender) => {
      const button = this.add.rectangle(x, height / 2 + 31, 210, 82, 0x6d2a24, 1).setStrokeStyle(3, 0xe8d29c, 1).setInteractive({ useHandCursor: true });
      const text = this.add.text(x, height / 2 + 31, label, { fontFamily: "Arial Black", fontSize: "22px", color: "#fff2d6" }).setOrigin(.5);
      button.on("pointerdown", () => { localStorage.setItem(PROFILE_KEY, value); this.gender = value; overlay.destroy(true); this.scene.restart(); });
      return [button, text];
    };
    const male = makeChoice(width / 2 - 120, "MALE", "male");
    const female = makeChoice(width / 2 + 120, "FEMALE", "female");
    const note = this.add.text(width / 2, height / 2 + 111, "Saved only on this device. You can change it anytime.", { fontFamily: "Georgia", fontSize: "14px", color: "#87918c" }).setOrigin(.5);
    overlay.add([block, panel, title, copy, ...male, ...female, note]);
  }
}

class ChapterTwoBattle extends Phaser.Scene {
  private battle: BattleState = { motherHealth: 100, rexHealth: 100 };
  private started = false;
  private ended = false;
  private remainingTime = 45;
  private pressTimes: number[] = [];
  private attackClock = 1450;
  private mother!: Phaser.GameObjects.Image;
  private rex!: Phaser.GameObjects.Image;
  private motherBar!: Phaser.GameObjects.Rectangle;
  private rexBar!: Phaser.GameObjects.Rectangle;
  private comboText!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private strikeButton!: Phaser.GameObjects.Container;
  private timerText!: Phaser.GameObjects.Text;
  private fightMusic!: Phaser.Sound.BaseSound;
  private winningMusic!: Phaser.Sound.BaseSound;

  constructor() { super("chapter2"); }

  init() {
    this.battle = { motherHealth: 100, rexHealth: 100 };
    this.started = false;
    this.ended = false;
    this.remainingTime = 45;
    this.pressTimes = [];
    this.attackClock = 1450;
  }

  preload() {
    this.load.image("chapter2-arena", "assets/chapter2-volcanic-arena.png");
    this.load.image("chapter2-mother", "assets/chapter2-mother.png");
    this.load.image("chapter2-rex", "assets/chapter2-rex.png");
    this.load.image("chapter2-victory", "assets/chapter2-sunset-victory.png");
    this.load.image("chapter2-failure", "assets/chapter2-failure-rain.png");
    this.load.audio("chapter2-fight-music", "assets/chapter2-fight-cover.mp3");
    this.load.audio("chapter2-winning-music", "assets/chapter2-winning-cover.mp3");
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "chapter2-arena").setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x260503, .15);
    this.makeAsh();
    this.rex = this.add.image(300, 425, "chapter2-rex").setDisplaySize(650, 366);
    this.mother = this.add.image(930, 420, "chapter2-mother").setDisplaySize(720, 480);

    this.add.rectangle(width / 2, 67, width, 134, 0x120403, .84);
    this.add.text(28, 15, "CHAPTER 2", { fontFamily: "Arial Black", fontSize: "17px", color: "#e0be82" });
    this.add.text(28, 40, "THE FIGHT SHE FINISHES", { fontFamily: "Arial Black", fontSize: "31px", color: "#fff0d1", stroke: "#230000", strokeThickness: 6 });
    this.add.text(30, 86, "Build a rapid rhythm. Six presses unleash her tail.", { fontFamily: "Georgia", fontSize: "16px", color: "#dbc9b1" });
    this.timerText = this.add.text(width - 28, 23, "00:45", { fontFamily: "Arial Black", fontSize: "32px", color: "#ffe5b5", stroke: "#230000", strokeThickness: 6 }).setOrigin(1, 0);
    this.add.text(width - 28, 63, "FIGHT ENDS AT 03:15", { fontFamily: "Arial Black", fontSize: "11px", color: "#c9ae82" }).setOrigin(1, 0);

    this.makeHealthMeter(28, 128, "SHARPTOOTH", 0xb72222);
    this.rexBar = this.add.rectangle(30, 158, 410, 20, 0xb72222).setOrigin(0, .5);
    this.makeHealthMeter(width - 440, 128, "LITTLEFOOT'S MOM", 0x69a75b);
    this.motherBar = this.add.rectangle(width - 438, 158, 410, 20, 0x69a75b).setOrigin(0, .5);

    this.status = this.add.text(width / 2, 543, "PRESS TO BEGIN — YOU HAVE 45 SECONDS", { fontFamily: "Arial Black", fontSize: "19px", color: "#fff0ce", stroke: "#210000", strokeThickness: 5 }).setOrigin(.5);
    this.comboText = this.add.text(width / 2, 574, "TAIL FORCE 0 / 6", { fontFamily: "Arial Black", fontSize: "14px", color: "#e4bd75", stroke: "#000", strokeThickness: 4 }).setOrigin(.5);
    this.strikeButton = this.makeStrikeButton(width / 2, 650);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", () => this.press());
    this.input.keyboard!.on("keydown-M", () => this.scene.start("menu"));
    this.fightMusic = this.sound.add("chapter2-fight-music");
    this.winningMusic = this.sound.add("chapter2-winning-music");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sound.stopAll());
  }

  private makeHealthMeter(x: number, y: number, label: string, color: number) {
    this.add.text(x, y - 24, label, { fontFamily: "Arial Black", fontSize: "15px", color: "#f1dfc4", stroke: "#000", strokeThickness: 4 });
    this.add.rectangle(x, y + 30, 414, 24, 0x0d0807, .94).setOrigin(0, .5).setStrokeStyle(2, 0xe1bd7c, .9);
    this.add.rectangle(x + 2, y + 30, 410, 20, color, .2).setOrigin(0, .5);
  }

  private makeStrikeButton(x: number, y: number) {
    const ring = this.add.circle(0, 0, 55, 0x160807, .95).setStrokeStyle(5, 0xf0bd5f, 1);
    const core = this.add.circle(0, 0, 42, 0x9b271d, 1).setStrokeStyle(3, 0xffe0a1, 1).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, -7, "STRIKE", { fontFamily: "Arial Black", fontSize: "18px", color: "#fff2d5", stroke: "#000", strokeThickness: 4 }).setOrigin(.5);
    const hint = this.add.text(0, 18, "CLICK / SPACE", { fontFamily: "Arial Black", fontSize: "8px", color: "#e8ce96" }).setOrigin(.5);
    core.on("pointerdown", () => this.press());
    this.tweens.add({ targets: ring, scale: 1.08, alpha: .72, duration: 500, yoyo: true, repeat: -1 });
    return this.add.container(x, y, [ring, core, label, hint]);
  }

  private press() {
    if (this.ended) return;
    if (!this.started) {
      this.started = true;
      this.fightMusic.play({ volume: .52, seek: 150 });
      this.status.setText("PRESS FAST — DO NOT LET HIM REACH HER");
    }
    const now = this.time.now;
    this.pressTimes = this.pressTimes.filter(t => now - t <= 750);
    this.pressTimes.push(now);
    this.comboText.setText(`TAIL FORCE ${Math.min(this.pressTimes.length, 6)} / 6`);
    this.tweens.add({ targets: this.strikeButton, scale: .87, duration: 55, yoyo: true });
    if (this.pressTimes.length < 6) return;
    this.pressTimes = [];
    this.battle = tailStrike(this.battle);
    this.attackClock += 420;
    this.status.setText("TAIL STRIKE! KEEP THE RHYTHM!");
    this.comboText.setText("TAIL FORCE 0 / 6");
    this.tweens.add({ targets: this.mother, x: this.mother.x - 45, angle: -7, duration: 120, yoyo: true, ease: "Back.out" });
    this.tweens.add({ targets: this.rex, x: this.rex.x - 70, angle: -5, duration: 180, yoyo: true, ease: "Quad.out" });
    this.cameras.main.shake(160, .009);
    this.throwDebris(530, 430);
    this.updateBattleUI();
  }

  update(_time: number, delta: number) {
    if (this.ended || !this.started) return;
    this.remainingTime = Math.max(0, this.remainingTime - delta / 1000);
    this.timerText.setText(`00:${Math.ceil(this.remainingTime).toString().padStart(2, "0")}`);
    if (this.remainingTime <= 0) {
      this.status.setText("TIME RAN OUT — HE REACHES HER");
      this.finish(false);
      return;
    }
    const now = this.time.now;
    this.pressTimes = this.pressTimes.filter(t => now - t <= 750);
    this.comboText.setText(`TAIL FORCE ${Math.min(this.pressTimes.length, 6)} / 6`);
    this.attackClock -= delta;
    if (this.attackClock <= 0) this.predatorAttack();
  }

  private predatorAttack() {
    this.attackClock = Phaser.Math.Between(1150, 1500);
    this.battle = rexAttack(this.battle);
    this.status.setText("HE BITES — FIGHT BACK FASTER!");
    this.tweens.add({ targets: this.rex, x: this.rex.x + 105, scaleX: 1.04, duration: 150, yoyo: true, ease: "Power2" });
    this.tweens.add({ targets: this.mother, x: this.mother.x + 30, alpha: .48, duration: 90, yoyo: true, repeat: 1 });
    this.cameras.main.shake(220, .012);
    this.updateBattleUI();
  }

  private updateBattleUI() {
    this.rexBar.width = 410 * this.battle.rexHealth / 100;
    this.motherBar.width = 410 * this.battle.motherHealth / 100;
    const outcome = battleOutcome(this.battle);
    if (outcome !== "fighting") this.finish(outcome === "won");
  }

  private finish(won: boolean) {
    this.ended = true;
    this.fightMusic.stop();
    if (won) this.winningMusic.play({ volume: .58 });
    if (won) localStorage.setItem(CHAPTER_TWO_HEALED_KEY, "true");
    this.tweens.killTweensOf([this.rex, this.mother]);
    if (won) {
      this.tweens.add({ targets: this.rex, x: -220, angle: -18, alpha: .15, duration: 1300, ease: "Quad.in" });
      this.tweens.add({ targets: this.mother, x: this.mother.x - 55, duration: 700, ease: "Back.out" });
    } else {
      this.tweens.add({ targets: this.mother, y: this.mother.y + 190, angle: 8, alpha: .2, duration: 1500, ease: "Quad.in" });
    }
    this.time.delayedCall(850, () => this.showBattleEnding(won));
  }

  private showBattleEnding(won: boolean) {
    const { width, height } = this.scale;
    if (won) {
      this.add.image(width / 2, height / 2, "chapter2-victory").setDisplaySize(width, height).setDepth(20);
      this.add.rectangle(width / 2, 80, width, 160, 0x1b0903, .68).setDepth(21);
      this.add.rectangle(width / 2, height - 80, width, 160, 0x1b0903, .52).setDepth(21);
    } else {
      this.add.image(width / 2, height / 2, "chapter2-failure").setDisplaySize(width, height).setDepth(20);
      this.add.rectangle(width / 2, height / 2, width, height, 0x02060d, .2).setDepth(21);
      this.add.rectangle(width / 2, height / 2, 680, 330, 0x04070b, .72).setDepth(21);
    }
    this.add.text(width / 2, won ? 31 : height / 2 - 100, won ? "THEY WALK AWAY TOGETHER" : "SHE FALLS AGAIN", { fontFamily: "Arial Black", fontSize: won ? "40px" : "49px", color: won ? "#fff0bd" : "#c9b5aa", stroke: "#250000", strokeThickness: 8 }).setOrigin(.5, won ? 0 : .5).setDepth(22);
    this.add.text(width / 2, won ? 84 : height / 2 - 34, won ? "This time, Littlefoot gets to keep his mother." : "The memory is unchanged. Get back up and rewrite it.", { fontFamily: "Georgia", fontSize: "23px", color: "#f2dfc5", stroke: "#250000", strokeThickness: 4 }).setOrigin(.5).setDepth(22);
    const buttonY = won ? height - 82 : height / 2 + 70;
    const button = this.add.rectangle(width / 2, buttonY, 280, 68, 0x8d271d, 1).setStrokeStyle(3, 0xf4cf83, 1).setDepth(22).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, buttonY, won ? "CONTINUE" : "TRY AGAIN", { fontFamily: "Arial Black", fontSize: "23px", color: "#fff0d0", stroke: "#000", strokeThickness: 4 }).setOrigin(.5).setDepth(23);
    button.on("pointerdown", () => { this.sound.stopAll(); won ? this.scene.start("bonus") : this.scene.restart(); });
    this.add.text(width / 2, won ? height - 30 : height / 2 + 130, "M: CHAPTER SELECT", { fontFamily: "Arial Black", fontSize: "12px", color: "#d3c3aa", stroke: "#000", strokeThickness: 3 }).setOrigin(.5).setDepth(22);
  }

  private makeAsh() {
    for (let i = 0; i < 55; i++) {
      const ash = this.add.circle(Phaser.Math.Between(0, 1280), Phaser.Math.Between(-100, 720), Phaser.Math.Between(1, 3), 0x1a0c08, Phaser.Math.FloatBetween(.2, .65));
      this.tweens.add({ targets: ash, x: ash.x - Phaser.Math.Between(80, 190), y: 760, duration: Phaser.Math.Between(2600, 5200), repeat: -1, delay: Phaser.Math.Between(0, 2400) });
    }
  }

  private throwDebris(x: number, y: number) {
    for (let i = 0; i < 9; i++) {
      const rock = this.add.rectangle(x, y, Phaser.Math.Between(5, 13), Phaser.Math.Between(5, 13), 0x35130c).setRotation(Phaser.Math.FloatBetween(0, 3));
      this.tweens.add({ targets: rock, x: x + Phaser.Math.Between(-100, 90), y: y + Phaser.Math.Between(-120, -35), angle: Phaser.Math.Between(-180, 180), alpha: 0, duration: 550, onComplete: () => rock.destroy() });
    }
  }
}

class BonusHealing extends Phaser.Scene {
  private panel?: Phaser.GameObjects.Container;
  private step = 0;
  private gender: PlayerGender = "male";

  constructor() { super("bonus"); }

  preload() {
    this.load.image("bonus-hug-boy", "assets/bonus-hug-boy.png");
    this.load.image("bonus-hug-girl", "assets/bonus-hug-girl.png");
    this.load.image("bonus-milk", "assets/bonus-milk.png");
    this.load.image("bonus-porch-boy", "assets/bonus-porch-boy.png");
    this.load.image("bonus-porch-girl", "assets/bonus-porch-girl.png");
    this.load.audio("bonus-love", "assets/bonus-voice-love.mp3");
    this.load.audio("bonus-milk-voice", "assets/bonus-voice-milk.mp3");
    this.load.audio("bonus-grass", "assets/bonus-voice-grass.mp3");
  }

  create() {
    this.step = 0;
    this.gender = localStorage.getItem(PROFILE_KEY) === "female" ? "female" : "male";
    this.showStep();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sound.stopAll());
  }

  private showStep() {
    this.sound.stopAll();
    this.panel?.destroy(true);
    const { width, height } = this.scale;
    const isGirl = this.gender === "female";
    const scenes = [
      { image: isGirl ? "bonus-hug-girl" : "bonus-hug-boy", audio: "bonus-love", title: "BONUS HEALING  •  HE STAYED", quote: "“You know... I love you. You're enough. I'm here.”" },
      { image: "bonus-milk", audio: "bonus-milk-voice", title: "BONUS HEALING  •  HE CAME BACK", quote: "“I brought back milk. Tomorrow, breakfast is on me! Cereal, everyone!”" },
      { image: isGirl ? "bonus-porch-girl" : "bonus-porch-boy", audio: "bonus-grass", title: "BONUS HEALING  •  HOME WAS ENOUGH", quote: "“Well... the grass wasn't greener on the other side.”" },
    ];
    const scene = scenes[this.step];
    const bg = this.add.image(width / 2, height / 2, scene.image).setDisplaySize(width, height);
    const top = this.add.rectangle(width / 2, 66, width, 132, 0x090806, .72);
    const bottom = this.add.rectangle(width / 2, height - 91, width, 182, 0x090806, .72);
    const kicker = this.add.text(30, 18, scene.title, { fontFamily: "Arial Black", fontSize: "25px", color: "#fff0cb", stroke: "#000", strokeThickness: 6 });
    const count = this.add.text(width - 28, 22, `${this.step + 1} / 3`, { fontFamily: "Arial Black", fontSize: "17px", color: "#d8c49b" }).setOrigin(1, 0);
    const quote = this.add.text(width / 2, height - 145, scene.quote, { fontFamily: "Georgia", fontStyle: "italic", fontSize: "24px", color: "#fff4dc", stroke: "#000", strokeThickness: 5, align: "center", wordWrap: { width: 1100 } }).setOrigin(.5);
    const final = this.step === 2;
    const button = this.add.rectangle(width / 2, height - 61, final ? 370 : 270, 60, 0x6d2a24, 1).setStrokeStyle(3, 0xffdda0, 1).setInteractive({ useHandCursor: true });
    const buttonText = this.add.text(width / 2, height - 61, final ? "CONTINUE TO CHAPTER 3" : "CONTINUE", { fontFamily: "Arial Black", fontSize: "19px", color: "#fff1d4", stroke: "#000", strokeThickness: 4 }).setOrigin(.5);
    this.panel = this.add.container(0, 0, [bg, top, bottom, kicker, count, quote, button, buttonText]);
    button.on("pointerdown", () => {
      if (final) {
        localStorage.setItem(BONUS_DONE_KEY, "true");
        this.scene.start("menu");
      } else {
        this.step += 1;
        this.showStep();
      }
    });
    this.sound.play(scene.audio, { volume: .9 });
  }
}

class SwampRescue extends Phaser.Scene {
  private state: RescueState = { depth: 65, stamina: 100, time: 105 };
  private started = false;
  private ended = false;
  private horse!: Phaser.GameObjects.Image;
  private rescuer!: Phaser.GameObjects.Image;
  private rope!: Phaser.GameObjects.Graphics;
  private panicEye!: Phaser.GameObjects.Container;
  private depthBar!: Phaser.GameObjects.Rectangle;
  private staminaBar!: Phaser.GameObjects.Rectangle;
  private status!: Phaser.GameObjects.Text;
  private timer!: Phaser.GameObjects.Text;
  private musicClock!: Phaser.GameObjects.Text;
  private pullButton!: Phaser.GameObjects.Container;
  private music!: Phaser.Sound.BaseSound;
  private victoryMusic!: Phaser.Sound.BaseSound;
  private effort = 0;
  private audioPosition = 15;
  private horsePullKick = 0;
  private rescuerPullKick = 0;

  constructor() { super("swamp"); }

  init() {
    this.state = { depth: 65, stamina: 100, time: 105 };
    this.started = false;
    this.ended = false;
    this.effort = 0;
    this.audioPosition = 15;
    this.horsePullKick = 0;
    this.rescuerPullKick = 0;
  }

  preload() {
    this.load.image("swamp", "assets/swamp-background.png");
    this.load.image("artax", "assets/artax-separated-v2.png");
    this.load.image("rescuer", "assets/rescuer-separated-v2.png");
    this.load.audio("chapter-music", "assets/chapter-1-cover.mp3");
    this.load.image("victory", "assets/childhood-healing-victory.png");
    this.load.audio("victory-theme", "assets/neverending-theme-cover.mp3");
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "swamp").setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x06100e, .24);
    this.makeAtmosphere(width, height);

    this.horse = this.add.image(315, 455, "artax").setDisplaySize(650, 364);
    this.rescuer = this.add.image(955, 455, "rescuer").setDisplaySize(680, 380);
    this.rope = this.add.graphics();
    this.panicEye = this.makePanicEye();
    this.add.rectangle(width / 2, 565, width, 175, 0x0b1715, .48);
    this.makeForegroundWater(width);

    this.add.rectangle(width / 2, 61, width, 122, 0x06100e, .8);
    this.add.text(34, 18, "CHAPTER 1", { fontFamily: "Arial Black", fontSize: "20px", color: "#d5c8aa" });
    this.add.text(34, 46, "THE SWAMP OF DARKNESS", { fontFamily: "Arial Black", fontSize: "34px", color: "#f4eee0", stroke: "#000", strokeThickness: 4 });
    this.add.text(36, 88, "Pull Artax free. Every hesitation drags him deeper.", { fontFamily: "Georgia", fontSize: "17px", color: "#c7d0cb" });
    this.timer = this.add.text(width - 158, 18, "01:45", { fontFamily: "Arial Black", fontSize: "29px", color: "#f4eee0", stroke: "#000", strokeThickness: 5 });
    this.musicClock = this.add.text(width - 158, 58, "MUSIC 00:15", { fontFamily: "Arial Black", fontSize: "14px", color: "#d5c8aa", stroke: "#000", strokeThickness: 3 });

    this.makeMeter(34, height - 127, "DEPTH", 0xb83f32);
    this.depthBar = this.add.rectangle(35, height - 91, 278, 18, 0xb83f32).setOrigin(0, .5);
    this.makeMeter(34, height - 70, "STAMINA", 0x65a662);
    this.staminaBar = this.add.rectangle(35, height - 34, 278, 18, 0x65a662).setOrigin(0, .5);
    this.status = this.add.text(width - 34, height - 38, "CLICK THE CENTER BUTTON — KEEP A RHYTHM", {
      fontFamily: "Arial Black", fontSize: "16px", color: "#f4eee0", stroke: "#000", strokeThickness: 4,
    }).setOrigin(1, .5);

    this.pullButton = this.makePullButton(width / 2, height - 82);
    const pullKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    pullKey.on("down", () => this.pull());
    this.input.keyboard!.on("keydown-M", () => { this.sound.stopAll(); this.scene.start("menu"); });
    this.music = this.sound.add("chapter-music");
    this.victoryMusic = this.sound.add("victory-theme");
  }

  private makeAtmosphere(width: number, height: number) {
    for (let i = 0; i < 9; i++) {
      const fog = this.add.ellipse(-180 + i * 190, 415 + (i % 3) * 32, 430, 70, 0xc7d1cc, .065);
      this.tweens.add({ targets: fog, x: fog.x + 360, duration: 15000 + i * 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }
    for (let i = 0; i < 70; i++) {
      const rain = this.add.rectangle(Phaser.Math.Between(0, width), Phaser.Math.Between(-height, height), 1, Phaser.Math.Between(8, 18), 0xd5e8eb, Phaser.Math.FloatBetween(.1, .32)).setRotation(-.18);
      this.tweens.add({ targets: rain, x: rain.x - 180, y: height + 30, duration: Phaser.Math.Between(1100, 2300), repeat: -1, delay: Phaser.Math.Between(0, 1800) });
    }
  }

  private makeForegroundWater(width: number) {
    for (let i = 0; i < 7; i++) {
      const ripple = this.add.ellipse(80 + i * 190, 525 + (i % 2) * 35, 220, 22, 0x8fa7a2, .06).setStrokeStyle(2, 0xb8cac5, .19);
      this.tweens.add({ targets: ripple, scaleX: 1.65, scaleY: .7, alpha: .01, duration: 1900 + i * 180, repeat: -1, delay: i * 240 });
    }
    this.add.rectangle(width / 2, 600, width, 120, 0x091513, .38);
    for (let i = 0; i < 5; i++) {
      const near = this.add.ellipse(150 + i * 270, 585 + (i % 2) * 28, 360, 30, 0x9fb3ae, .08).setStrokeStyle(3, 0xc4d2ce, .16);
      this.tweens.add({ targets: near, x: near.x + 55, scaleX: 1.25, alpha: .025, duration: 2200 + i * 300, yoyo: true, repeat: -1 });
    }
  }

  private makePanicEye() {
    const white = this.add.ellipse(0, 0, 31, 25, 0xf5eee0, 1).setStrokeStyle(3, 0x3a2118, 1);
    const iris = this.add.circle(3, 1, 8, 0x8d4c22, 1).setStrokeStyle(2, 0x180d08, 1);
    const pupil = this.add.circle(5, 1, 4, 0x050302, 1);
    const shine = this.add.circle(7, -2, 2, 0xffffff, .9);
    const lid = this.add.arc(0, -1, 18, 200, 342, false, 0x5e3024, 0).setStrokeStyle(3, 0x51291f, .9);
    return this.add.container(0, 0, [white, iris, pupil, shine, lid]).setAlpha(0).setDepth(8);
  }

  private updateRopeAndEye() {
    const horseEnd = new Phaser.Math.Vector2(this.horse.x + 205, this.horse.y - 12);
    const handEnd = new Phaser.Math.Vector2(this.rescuer.x - 22, this.rescuer.y - 3);
    const mid = new Phaser.Math.Vector2((horseEnd.x + handEnd.x) / 2, (horseEnd.y + handEnd.y) / 2 + 4);
    const ropePoints = [horseEnd, mid, handEnd];
    this.rope.clear();
    this.rope.lineStyle(11, 0x24120b, .96).strokePoints(ropePoints, false, false);
    this.rope.lineStyle(7, 0x70401f, 1).strokePoints(ropePoints, false, false);
    this.rope.lineStyle(2, 0xc18a45, .7).strokePoints(ropePoints, false, false);
    this.rope.fillStyle(0x3a1c0d, 1).fillCircle(horseEnd.x, horseEnd.y, 9).fillCircle(handEnd.x, handEnd.y, 8);

    const nearFreedom = rescuePhase(this.audioPosition) === "release" && this.state.depth <= 18 && this.effort >= 45;
    const panic = nearFreedom ? Phaser.Math.Clamp((18 - this.state.depth) / 13, .18, 1) : 0;
    this.panicEye.setPosition(this.horse.x + 53, this.horse.y - 99).setRotation(this.horse.rotation).setAlpha(panic);
    this.panicEye.setScale(.8 + panic * .55, .8 + panic * .72);
  }

  private makePullButton(x: number, y: number) {
    const shadow = this.add.circle(5, 8, 57, 0x000000, .6);
    const ring = this.add.circle(0, 0, 57, 0x111a18, .96).setStrokeStyle(5, 0xd5c8aa, 1);
    const core = this.add.circle(0, 0, 43, 0x7b2e25, 1).setStrokeStyle(3, 0xf0dfb5, .85).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, -7, "PULL", { fontFamily: "Arial Black", fontSize: "22px", color: "#fff5db", stroke: "#000", strokeThickness: 4 }).setOrigin(.5);
    const hint = this.add.text(0, 18, "CLICK", { fontFamily: "Arial Black", fontSize: "10px", color: "#d6c9a9" }).setOrigin(.5);
    core.on("pointerdown", () => this.pull());
    core.on("pointerover", () => ring.setStrokeStyle(6, 0xffedba, 1));
    core.on("pointerout", () => ring.setStrokeStyle(5, 0xd5c8aa, 1));
    const button = this.add.container(x, y, [shadow, ring, core, label, hint]);
    this.tweens.add({ targets: ring, scale: 1.08, alpha: .78, duration: 650, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    return button;
  }

  private makeMeter(x: number, y: number, label: string, color: number) {
    this.add.text(x, y, label, { fontFamily: "Arial Black", fontSize: "15px", color: "#eee7d8", stroke: "#000", strokeThickness: 3 });
    this.add.rectangle(x, y + 36, 280, 22, 0x050807, .88).setOrigin(0, .5).setStrokeStyle(2, 0xd5c8aa, .9);
    this.add.rectangle(x + 1, y + 36, 278, 18, color).setOrigin(0, .5).setAlpha(.18);
  }

  private pull() {
    if (this.ended) return;
    if (!this.music.isPlaying) this.music.play({ loop: true, volume: .42, seek: 15 });
    this.started = true;
    const before = this.state.depth;
    this.state = tapPull(this.state);
    if (this.state.depth === before) {
      this.status.setText("NO STRENGTH — WAIT HALF A BEAT");
      this.cameras.main.shake(90, .003);
      return;
    }
    this.effort += 1;
    const phase = rescuePhase(this.audioPosition);
    if (phase === "struggle") {
      this.state.depth = Math.max(28, this.state.depth);
      this.status.setText("THE DARKNESS HOLDS HIM — KEEP FIGHTING");
    } else if (phase === "extract") {
      this.status.setText("THE GRIP IS BREAKING — GAIN GROUND");
    } else {
      this.state.depth = Math.max(0, this.state.depth - 3.4);
      this.status.setText(this.effort >= 55 ? "NOW! PULL HIM FREE!" : "NOT ENOUGH FORCE — KEEP PULLING");
    }
    this.horsePullKick = 16;
    this.rescuerPullKick = 18;
    this.tweens.add({ targets: this, horsePullKick: 0, duration: 170, ease: "Quad.out" });
    this.tweens.add({ targets: this, rescuerPullKick: 0, duration: 230, ease: "Back.out" });
    this.tweens.add({ targets: this.horse, angle: -1.8, duration: 85, yoyo: true, ease: "Quad.out" });
    this.tweens.add({ targets: this.rescuer, angle: 2.2, duration: 110, yoyo: true, ease: "Back.out" });
    this.tweens.add({ targets: this.pullButton, scale: .88, duration: 65, yoyo: true });
    this.cameras.main.shake(85, .0027);
  }

  update(_time: number, delta: number) {
    if (!this.started || this.ended) return;
    this.state = stepTapRescue(this.state, delta / 1000);
    this.audioPosition = 15 + (105 - this.state.time);
    if (rescuePhase(this.audioPosition) === "struggle") this.state.depth = Math.max(28, this.state.depth);
    this.depthBar.width = 278 * this.state.depth / 100;
    this.staminaBar.width = 278 * this.state.stamina / 100;
    const swampDrag = Math.max(0, this.state.depth - 28);
    this.horse.x = 315 - swampDrag * .62 + this.horsePullKick;
    this.horse.y = 350 + this.state.depth * 1.72;
    this.horse.angle = Math.sin(this.time.now / 125) * (this.state.depth / 55);
    this.rescuer.x = 955 + this.rescuerPullKick;
    this.rescuer.y = 455 + Math.sin(this.time.now / 240) * 2;
    this.updateRopeAndEye();
    const remaining = Math.ceil(this.state.time);
    this.timer.setText(`${Math.floor(remaining / 60).toString().padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`);
    const musicSeconds = Math.floor(this.audioPosition);
    this.musicClock.setText(`MUSIC ${Math.floor(musicSeconds / 60).toString().padStart(2, "0")}:${(musicSeconds % 60).toString().padStart(2, "0")}`);
    const won = canRescue(this.audioPosition, this.effort, this.state.depth);
    if (won || this.state.depth >= 100 || this.state.time <= 0) {
      this.ended = true;
      this.showEnding(won);
      this.input.keyboard!.once("keydown-R", () => { this.sound.stopAll(); this.scene.restart(); });
    }
  }

  private showEnding(won: boolean) {
    const { width, height } = this.scale;
    if (!won) this.music.stop();
    if (won) {
      localStorage.setItem(CHAPTER_ONE_HEALED_KEY, "true");
      this.music.stop();
      this.victoryMusic.play({ volume: .58 });
      const victory = this.add.image(width / 2, height / 2, "victory").setDisplaySize(width, height).setAlpha(0).setDepth(30);
      const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x07100d, .25).setAlpha(0).setDepth(31);
      const glow = this.add.rectangle(width / 2, 92, width, 184, 0x07100d, .72).setAlpha(0).setDepth(32);
      const healing = this.add.text(width / 2, 42, "CHILDHOOD HEALING", {
        fontFamily: "Arial Black", fontSize: "46px", color: "#fff0c2", stroke: "#2a170c", strokeThickness: 8, letterSpacing: 4,
      }).setOrigin(.5, 0).setAlpha(0).setDepth(33);
      const message = this.add.text(width / 2, 105, "ARTAX IS FREE  •  YOU CHANGED THE ENDING", {
        fontFamily: "Georgia", fontSize: "23px", color: "#f7ead3", stroke: "#1a0e08", strokeThickness: 5,
      }).setOrigin(.5, 0).setAlpha(0).setDepth(33);
      const gender = localStorage.getItem(PROFILE_KEY) as PlayerGender | null;
      const pronoun = gender === "female" ? "HER" : "HIM";
      const affirmation = this.add.text(width / 2, 143, `THE CHILD INSIDE ${pronoun} IS SAFE NOW`, {
        fontFamily: "Arial Black", fontSize: "16px", color: "#edcf88", stroke: "#1a0e08", strokeThickness: 4, letterSpacing: 2,
      }).setOrigin(.5, 0).setAlpha(0).setDepth(33);
      const continueButton = this.add.rectangle(width / 2, height - 83, 286, 62, 0x6d2a24, 1).setStrokeStyle(3, 0xffe0a0, 1).setAlpha(0).setDepth(34).setInteractive({ useHandCursor: true });
      const continueText = this.add.text(width / 2, height - 83, "CONTINUE", { fontFamily: "Arial Black", fontSize: "22px", color: "#fff2d4", stroke: "#000", strokeThickness: 4 }).setOrigin(.5).setAlpha(0).setDepth(35);
      continueButton.on("pointerdown", () => { this.sound.stopAll(); this.scene.start("menu"); });
      const replay = this.add.text(width / 2, height - 35, "R: REPLAY CHAPTER   •   M: CHAPTER SELECT", {
        fontFamily: "Arial Black", fontSize: "12px", color: "#e0d4bd", stroke: "#000", strokeThickness: 4,
      }).setOrigin(.5).setAlpha(0).setDepth(33);
      this.tweens.add({ targets: [victory, shade, glow], alpha: 1, duration: 1100, ease: "Sine.out" });
      this.tweens.add({ targets: [healing, message, affirmation, continueButton, continueText, replay], alpha: 1, y: "-=8", duration: 900, delay: 650, ease: "Quad.out" });
      return;
    }
    this.tweens.add({ targets: this.horse, x: won ? this.horse.x + 150 : this.horse.x - 30, y: won ? this.horse.y - 145 : this.horse.y + 260, alpha: won ? 1 : .12, duration: won ? 1400 : 2300, ease: won ? "Back.out" : "Sine.in" });
    this.tweens.add({ targets: this.rescuer, x: won ? this.rescuer.x + 45 : this.rescuer.x - 20, angle: won ? 8 : -5, duration: 1200, ease: "Quad.out" });
    this.time.delayedCall(won ? 800 : 1500, () => {
      this.add.rectangle(width / 2, height / 2, width, height, 0x030706, .74);
      this.add.text(width / 2, height / 2 - 42, won ? "ARTAX IS FREE" : "THE DARKNESS TOOK ARTAX", { fontFamily: "Arial Black", fontSize: won ? "46px" : "40px", color: won ? "#e8d7a8" : "#c6d1ce", align: "center", stroke: "#000", strokeThickness: 7 }).setOrigin(.5);
      this.add.text(width / 2, height / 2 + 35, won ? "Your hands ache. The rope finally gives." : "You lost the rhythm for too long.", { fontFamily: "Georgia", fontSize: "25px", color: "#f1eee7" }).setOrigin(.5);
      this.add.text(width / 2, height / 2 + 79, "CHAPTER 1 REMAINS UNHEALED", { fontFamily: "Arial Black", fontSize: "15px", color: "#9ba8a3" }).setOrigin(.5);
      const retryButton = this.add.rectangle(width / 2, height / 2 + 132, 246, 62, 0x6d2a24, 1).setStrokeStyle(3, 0xe8d29c, 1).setInteractive({ useHandCursor: true });
      this.add.text(width / 2, height / 2 + 132, "RETRY", { fontFamily: "Arial Black", fontSize: "22px", color: "#fff2d6", stroke: "#000", strokeThickness: 4 }).setOrigin(.5);
      retryButton.on("pointerdown", () => { this.sound.stopAll(); this.scene.restart(); });
    });
  }
}

new Phaser.Game({ type: Phaser.AUTO, parent: "game", width: 1280, height: 720, backgroundColor: "#07100f", scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [ChapterSelect, SwampRescue, ChapterTwoBattle, BonusHealing] });
