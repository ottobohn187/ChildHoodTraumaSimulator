import Phaser from "phaser";
import "./style.css";
import { canRescue, rescuePhase, stepTapRescue, tapPull, type RescueState } from "./game/rescuePhysics";

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
      this.input.keyboard!.once("keydown-R", () => this.scene.restart());
    }
  }

  private showEnding(won: boolean) {
    const { width, height } = this.scale;
    if (won) {
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
      const replay = this.add.text(width / 2, height - 42, "PRESS R TO RETURN TO THE SWAMP", {
        fontFamily: "Arial Black", fontSize: "16px", color: "#f5e7c6", stroke: "#000", strokeThickness: 5,
      }).setOrigin(.5).setAlpha(0).setDepth(33);
      this.tweens.add({ targets: [victory, shade, glow], alpha: 1, duration: 1100, ease: "Sine.out" });
      this.tweens.add({ targets: [healing, message, replay], alpha: 1, y: "-=8", duration: 900, delay: 650, ease: "Quad.out" });
      return;
    }
    this.tweens.add({ targets: this.horse, x: won ? this.horse.x + 150 : this.horse.x - 30, y: won ? this.horse.y - 145 : this.horse.y + 260, alpha: won ? 1 : .12, duration: won ? 1400 : 2300, ease: won ? "Back.out" : "Sine.in" });
    this.tweens.add({ targets: this.rescuer, x: won ? this.rescuer.x + 45 : this.rescuer.x - 20, angle: won ? 8 : -5, duration: 1200, ease: "Quad.out" });
    this.time.delayedCall(won ? 800 : 1500, () => {
      this.add.rectangle(width / 2, height / 2, width, height, 0x030706, .74);
      this.add.text(width / 2, height / 2 - 42, won ? "ARTAX IS FREE" : "THE DARKNESS TOOK ARTAX", { fontFamily: "Arial Black", fontSize: won ? "46px" : "40px", color: won ? "#e8d7a8" : "#c6d1ce", align: "center", stroke: "#000", strokeThickness: 7 }).setOrigin(.5);
      this.add.text(width / 2, height / 2 + 35, won ? "Your hands ache. The rope finally gives." : "You lost the rhythm for too long.", { fontFamily: "Georgia", fontSize: "25px", color: "#f1eee7" }).setOrigin(.5);
      this.add.text(width / 2, height / 2 + 92, "PRESS R TO TRY AGAIN", { fontFamily: "Arial Black", fontSize: "18px", color: "#b9c6bc" }).setOrigin(.5);
    });
  }
}

new Phaser.Game({ type: Phaser.AUTO, parent: "game", width: 1280, height: 720, backgroundColor: "#07100f", scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: SwampRescue });
