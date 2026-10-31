import Phaser from "phaser";
import "./style.css";
import { canRescue, rescuePhase, stepTapRescue, tapPull, type RescueState } from "./game/rescuePhysics";
import { battleOutcome, rexAttack, tailStrike, type BattleState } from "./game/chapter2Physics";
import { DIP_RESCUE_SECONDS, dipRescueOutcome, stepDipRescue, tapRun, type DipRescueState } from "./game/chapter3Physics";
import { YELLER_RESCUE_SECONDS, stepYellerRescue, tapYellerRun, yellerRescueOutcome, type YellerRescueState } from "./game/chapter4Physics";

type PlayerGender = "male" | "female" | "nonbinary";
const PROFILE_KEY = "trauma-player-gender";
const CHAPTER_ONE_HEALED_KEY = "trauma-chapter-1-healed";
const CHAPTER_TWO_HEALED_KEY = "trauma-chapter-2-healed";
const CHAPTER_THREE_HEALED_KEY = "trauma-chapter-3-healed";
const CHAPTER_FOUR_HEALED_KEY = "trauma-chapter-4-healed";
const BONUS_DONE_KEY = "trauma-bonus-done";
const CHAPTER_FOUR_BONUS_DONE_KEY = "trauma-chapter-4-bonus-done";
const CHAPTER_FIVE_HEALED_KEY = "trauma-chapter-5-healed";
const CHAPTER_SIX_COMPLETE_KEY = "trauma-chapter-6-complete";
const PROGRESSION_KEYS = [
  CHAPTER_ONE_HEALED_KEY,
  CHAPTER_TWO_HEALED_KEY,
  BONUS_DONE_KEY,
  CHAPTER_THREE_HEALED_KEY,
  CHAPTER_FOUR_HEALED_KEY,
  CHAPTER_FOUR_BONUS_DONE_KEY,
  CHAPTER_FIVE_HEALED_KEY,
  CHAPTER_SIX_COMPLETE_KEY,
] as const;

function resetGameState(clearProfile = true) {
  PROGRESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  if (clearProfile) localStorage.removeItem(PROFILE_KEY);
}

function savedGender(): PlayerGender | null {
  const value = localStorage.getItem(PROFILE_KEY);
  return value === "male" || value === "female" || value === "nonbinary" ? value : null;
}
type TraumaRadioTrack = { title: string; chapter: string; file: string; artist?: string; album?: string };
const TRAUMA_RADIO_TRACKS = [
  { title: "System Idle", chapter: "Main Menu", file: "assets/menu-system-idle.mp3", artist: "Net Gainz", album: "Cyberspace Grind" },
  { title: "Artax and the Swamp of Sadness", chapter: "Chapter 1", file: "assets/chapter-1-cover.mp3" },
  { title: "The NeverEnding Story Theme", chapter: "Chapter 1 • Healed", file: "assets/neverending-theme-cover.mp3" },
  { title: "The Fight She Finishes", chapter: "Chapter 2", file: "assets/chapter2-fight-cover.mp3" },
  { title: "If We Hold On Together", chapter: "Chapter 2 • Failure", file: "assets/chapter2-failure-cover.mp3" },
  { title: "The Land Before Time", chapter: "Chapter 2 • Healed", file: "assets/chapter2-winning-cover.mp3" },
  { title: "Past Lives", chapter: "After Chapter 2", file: "assets/bonus-past-lives.mp3" },
  { title: "The Dip", chapter: "Chapter 3", file: "assets/chapter3-dip-music.mp3" },
  { title: "Please Hold Me", chapter: "After Chapter 4", file: "assets/chapter4-bonus-please-hold-me.mp3" },
  { title: "Old Yeller", chapter: "Chapter 4", file: "assets/chapter4-main.mp3" },
  { title: "Mother's Run", chapter: "Chapter 5", file: "assets/chapter5-main.mp3" },
  { title: "I Bring You a Song", chapter: "Chapter 5 • Healed", file: "assets/chapter5-winning.mp3" },
  { title: "You Were Just a Kid", chapter: "Chapter 6", file: "assets/chapter6-last-scene.mp3" },
  { title: "Adulthood Unlocked", chapter: "End Credits", file: "assets/chapter6-end-credits.mp3" },
] as const satisfies readonly TraumaRadioTrack[];

type RadioWakeLock = { release: () => Promise<void> };
let traumaRadioAudio: HTMLAudioElement | null = null;
let traumaRadioIndex = 0;
let traumaRadioWakeLock: RadioWakeLock | null = null;

function getTraumaRadioAudio() {
  if (traumaRadioAudio) return traumaRadioAudio;
  traumaRadioAudio = new Audio();
  traumaRadioAudio.preload = "metadata";
  traumaRadioAudio.volume = .72;
  traumaRadioAudio.addEventListener("ended", () => playTraumaRadioTrack((traumaRadioIndex + 1) % TRAUMA_RADIO_TRACKS.length));
  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", () => resumeTraumaRadio());
    navigator.mediaSession.setActionHandler("pause", () => pauseTraumaRadio());
    navigator.mediaSession.setActionHandler("previoustrack", () => playTraumaRadioTrack((traumaRadioIndex + TRAUMA_RADIO_TRACKS.length - 1) % TRAUMA_RADIO_TRACKS.length));
    navigator.mediaSession.setActionHandler("nexttrack", () => playTraumaRadioTrack((traumaRadioIndex + 1) % TRAUMA_RADIO_TRACKS.length));
  }
  return traumaRadioAudio;
}

async function requestTraumaRadioWakeLock() {
  const wakeNavigator = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<RadioWakeLock> } };
  if (!wakeNavigator.wakeLock || traumaRadioWakeLock) return;
  try {
    traumaRadioWakeLock = await wakeNavigator.wakeLock.request("screen");
  } catch {
    traumaRadioWakeLock = null;
  }
}

function updateTraumaRadioMediaSession() {
  if (!("mediaSession" in navigator)) return;
  const track = TRAUMA_RADIO_TRACKS[traumaRadioIndex];
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: "artist" in track ? track.artist : "Childhood Trauma Simulator",
    album: "album" in track ? track.album : `Trauma Radio • ${track.chapter}`,
    artwork: [{ src: new URL("assets/chapter6-bedroom.png", window.location.href).href, sizes: "1280x720", type: "image/png" }],
  });
  navigator.mediaSession.playbackState = traumaRadioAudio?.paused ? "paused" : "playing";
}

function notifyTraumaRadio() {
  window.dispatchEvent(new CustomEvent("trauma-radio-change", { detail: { index: traumaRadioIndex, playing: !traumaRadioAudio?.paused } }));
}

function playTraumaRadioTrack(index: number) {
  traumaRadioIndex = Phaser.Math.Wrap(index, 0, TRAUMA_RADIO_TRACKS.length);
  const audio = getTraumaRadioAudio();
  audio.src = new URL(TRAUMA_RADIO_TRACKS[traumaRadioIndex].file, window.location.href).href;
  audio.play().then(() => requestTraumaRadioWakeLock()).catch(() => notifyTraumaRadio());
  updateTraumaRadioMediaSession();
  notifyTraumaRadio();
}

function resumeTraumaRadio() {
  const audio = getTraumaRadioAudio();
  if (!audio.src) return playTraumaRadioTrack(traumaRadioIndex);
  audio.play().then(() => requestTraumaRadioWakeLock()).catch(() => undefined);
  updateTraumaRadioMediaSession();
  notifyTraumaRadio();
}

function pauseTraumaRadio() {
  traumaRadioAudio?.pause();
  traumaRadioWakeLock?.release().catch(() => undefined);
  traumaRadioWakeLock = null;
  updateTraumaRadioMediaSession();
  notifyTraumaRadio();
}

function stopTraumaRadio() {
  pauseTraumaRadio();
  if (traumaRadioAudio) traumaRadioAudio.currentTime = 0;
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && traumaRadioAudio && !traumaRadioAudio.paused) requestTraumaRadioWakeLock();
});

function addAlwaysAvailableMenuButton(scene: Phaser.Scene) {
  const button = scene.add.rectangle(68, 701, 120, 28, 0x080a0b, .88).setStrokeStyle(1, 0x9da4a2, .8).setInteractive({ useHandCursor: true }).setDepth(500);
  scene.add.text(68, 701, "MAIN MENU", { fontFamily: "Arial Black", fontSize: "10px", color: "#e2e5e3", stroke: "#000", strokeThickness: 3 }).setOrigin(.5).setDepth(501);
  button.on("pointerdown", () => { scene.sound.stopAll(); scene.scene.start("menu"); });
}
const CHAPTER_SIX_CREDIT_BEATS = [
  { key: "healing-room", title: "YOU CAME BACK", caption: "The child no longer has to wait alone.", horror: false },
  { key: "bike", title: "LEARNING TO RIDE", caption: "This time, someone runs beside you.", horror: false },
  { key: "parent", title: "THE PARENT YOU NEEDED", caption: "Soft voices. Safe rooms. A different ending.", horror: false },
  { key: "porch", title: "THE CHILD GETS TO REST", caption: "Maybe healing can feel this ordinary.", horror: false },
  { key: "anxiety", title: "ADULTHOOD UNLOCKED", caption: "CRIPPLING ANXIETY", horror: true },
  { key: "divorce", title: "DIVORCE", caption: "Two homes. One empty chair.", horror: true },
  { key: "bad-parent", title: "THE CYCLE KNOCKS", caption: "What if you become the parent you feared?", horror: true },
  { key: "job", title: "YOUR DREAM JOB", caption: "The dream was apparently fluorescent.", horror: true },
  { key: "teams", title: "MICROSOFT TEAMS", caption: "INCOMING CALL", horror: true },
  { key: "fort", title: "WE MADE HOME SAFE", caption: "The rain stays outside. You stay together.", horror: false },
  { key: "ordinary-morning", title: "NOTHING BAD HAPPENED", caption: "Just an ordinary morning. Finally.", horror: false },
  { key: "homeownership", title: "HOMEOWNERSHIP", caption: "The ceiling has become a waterfall.", horror: true }
];

class ChapterSelect extends Phaser.Scene {
  private gender: PlayerGender | null = null;
  private chapterOneHealed = false;
  private chapterTwoHealed = false;
  private chapterThreeHealed = false;
  private chapterFourHealed = false;
  private bonusDone = false;
  private chapterFourBonusDone = false;
  private chapterFiveHealed = false;
  private chapterSixComplete = false;
  private menuMusic?: Phaser.Sound.BaseSound;

  constructor() { super("menu"); }

  preload() {
    this.load.image("swamp", "assets/swamp-background.png");
    this.load.image("victory", "assets/childhood-healing-victory.png");
    this.load.image("artax", "assets/artax-separated-v2.png");
    this.load.image("chapter2-arena", "assets/chapter2-volcanic-arena.png");
    this.load.image("menu-header", "assets/menu-header-reference.png");
    this.load.audio("menu-system-idle", "assets/menu-system-idle.mp3");
  }

  create() {
    const { width, height } = this.scale;
    if (localStorage.getItem(CHAPTER_SIX_COMPLETE_KEY) === "true") resetGameState();
    this.gender = savedGender();
    this.chapterOneHealed = localStorage.getItem(CHAPTER_ONE_HEALED_KEY) === "true";
    this.chapterTwoHealed = this.chapterOneHealed && localStorage.getItem(CHAPTER_TWO_HEALED_KEY) === "true";
    this.bonusDone = this.chapterTwoHealed && localStorage.getItem(BONUS_DONE_KEY) === "true";
    this.chapterThreeHealed = this.bonusDone && localStorage.getItem(CHAPTER_THREE_HEALED_KEY) === "true";
    this.chapterFourHealed = this.chapterThreeHealed && localStorage.getItem(CHAPTER_FOUR_HEALED_KEY) === "true";
    this.chapterFourBonusDone = this.chapterFourHealed && localStorage.getItem(CHAPTER_FOUR_BONUS_DONE_KEY) === "true";
    this.chapterFiveHealed = this.chapterFourBonusDone && localStorage.getItem(CHAPTER_FIVE_HEALED_KEY) === "true";
    this.chapterSixComplete = this.chapterFiveHealed && localStorage.getItem(CHAPTER_SIX_COMPLETE_KEY) === "true";
    this.add.image(width / 2, height / 2, "swamp").setDisplaySize(width, height).setAlpha(.34);
    this.add.rectangle(width / 2, height / 2, width, height, 0x030606, .67);
    this.makeMenuHeader(width);

    this.makeChapterCard(36, 174, 748, 390);
    this.makeChapterTwoCard(808, 174, 436, 390);
    this.makeChapterRail();
    this.makeTraumaRadioShortcut();
    this.makeResetButton();

    this.menuMusic = this.sound.add("menu-system-idle", { volume: .38, loop: true });
    this.menuMusic.play();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.menuMusic?.stop());

    const profileLabel = this.gender === "nonbinary" ? "NON-BINARY" : this.gender?.toUpperCase();
    const profile = this.add.text(width - 38, height - 24, this.gender ? `PROFILE: ${profileLabel}  •  CHANGE` : "CHOOSE YOUR PROFILE", {
      fontFamily: "Arial Black", fontSize: "12px", color: "#d7c9aa",
    }).setOrigin(1, .5).setInteractive({ useHandCursor: true });
    profile.on("pointerdown", () => this.showGenderPrompt());
    if (!this.gender) this.showGenderPrompt();
  }

  private makeMenuHeader(width: number) {
    this.add.image(width / 2, 74.5, "menu-header").setDisplaySize(width, 149);
    this.add.rectangle(width / 2, 146, width, 8, 0x0a1413, .95);
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
    const available = this.chapterOneHealed;
    this.add.image(x + w / 2, y + h / 2, "chapter2-arena").setDisplaySize(w, h).setAlpha(available ? .62 : .18);
    const card = this.add.rectangle(x, y, w, h, 0x050606, available ? .52 : .72).setOrigin(0).setStrokeStyle(2, available ? 0xc5a964 : 0x606663, .8);
    if (available) card.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.scene.start("chapter2"));
    this.add.text(x + 24, y + 20, "CHAPTER 2", { fontFamily: "Arial Black", fontSize: "20px", color: available ? "#d6c49b" : "#777e79" });
    this.add.text(x + 24, y + 54, available ? "MEMORY UNLOCKED" : "LOCKED MEMORY", { fontFamily: "Arial Black", fontSize: "31px", color: available ? "#eee4ce" : "#929894", stroke: "#000", strokeThickness: 5 });
    this.add.text(x + w / 2, y + h / 2 + 12, available ? "II" : "🔒", { fontFamily: "Georgia", fontStyle: "bold", fontSize: "68px", color: "#d8c084" }).setOrigin(.5);
    this.add.text(x + w / 2, y + h - 48, available ? (this.chapterTwoHealed ? "✓ HEALED  •  CLICK TO REPLAY" : "CLICK TO FIGHT") : "HEAL CHAPTER 1 TO CONTINUE", { fontFamily: "Arial Black", fontSize: "14px", color: available ? "#e2ca8e" : "#777e79" }).setOrigin(.5);
  }

  private makeChapterRail() {
    const stages = [
      { label: "1. ARTAX", scene: "swamp", unlocked: true, complete: this.chapterOneHealed },
      { label: "2. LITTLEFOOT", scene: "chapter2", unlocked: this.chapterOneHealed, complete: this.chapterTwoHealed },
      { label: "BONUS 2", scene: "bonus", unlocked: this.chapterTwoHealed, complete: this.bonusDone },
      { label: "3. THE DIP", scene: "chapter3", unlocked: this.bonusDone, complete: this.chapterThreeHealed },
      { label: "4. YELLER", scene: "chapter4", unlocked: this.chapterThreeHealed, complete: this.chapterFourHealed },
      { label: "BONUS 4", scene: "chapter4bonus", unlocked: this.chapterFourHealed, complete: this.chapterFourBonusDone },
      { label: "5. BAMBI", scene: "chapter5", unlocked: this.chapterFourBonusDone, complete: this.chapterFiveHealed },
      { label: "6. TRUE END", scene: "chapter6", unlocked: this.chapterFiveHealed, complete: this.chapterSixComplete },
    ];
    stages.forEach((stage, i) => {
      const x = 17 + i * 157;
      const rail = this.add.rectangle(x, 584, 145, 91, stage.complete ? 0x284b35 : stage.unlocked ? 0x183224 : 0x0b0e0d, .96).setOrigin(0).setStrokeStyle(stage.complete ? 3 : 2, stage.complete ? 0xb7e38f : stage.unlocked ? 0x71d86f : 0x474c49, 1);
      this.add.text(x + 72.5, 642, stage.complete ? `${stage.label}\nHEALED` : stage.label, { fontFamily: "Arial Black", fontSize: stage.complete ? "10px" : "11px", align: "center", color: stage.complete ? "#e2f6d4" : stage.unlocked ? "#c9f5b9" : "#676c69", lineSpacing: 4 }).setOrigin(.5);
      this.add.text(x + 72.5, 611, stage.complete ? "✓" : stage.unlocked ? "PLAY" : "🔒", { fontFamily: "Arial Black", fontSize: stage.complete ? "21px" : stage.unlocked ? "12px" : "20px", color: stage.complete ? "#bceaa8" : stage.unlocked ? "#83cf78" : "#676c69" }).setOrigin(.5);
      if (stage.unlocked) {
        rail.setInteractive({ useHandCursor: true });
        rail.on("pointerover", () => rail.setStrokeStyle(4, 0xa5ff91, 1));
        rail.on("pointerout", () => rail.setStrokeStyle(stage.complete ? 3 : 2, stage.complete ? 0xb7e38f : 0x71d86f, 1));
        rail.on("pointerdown", () => this.gender ? this.scene.start(stage.scene) : this.showGenderPrompt());
      }
    });
  }

  private makeFinalBossShortcut(width: number) {
    const button = this.add.rectangle(width - 160, 548, 276, 38, 0x5b244d, .98).setStrokeStyle(2, 0xef9bdb, 1).setInteractive({ useHandCursor: true });
    this.add.text(width - 160, 548, "SECRET FINAL BOSS: YOU", { fontFamily: "Arial Black", fontSize: "12px", color: "#ffe4f7", stroke: "#1b0717", strokeThickness: 3 }).setOrigin(.5);
    button.on("pointerover", () => button.setFillStyle(0x87366f, 1));
    button.on("pointerout", () => button.setFillStyle(0x5b244d, .98));
    button.on("pointerdown", () => this.gender ? this.scene.start("chapter6") : this.showGenderPrompt());
  }

  private makeCreditsDebugShortcut(width: number) {
    const button = this.add.rectangle(width - 470, 548, 250, 38, 0x193b50, .98).setStrokeStyle(2, 0x8bdfff, 1).setInteractive({ useHandCursor: true });
    this.add.text(width - 470, 548, "DEBUG: END CREDIT SCENES", { fontFamily: "Arial Black", fontSize: "11px", color: "#dcf7ff", stroke: "#07151c", strokeThickness: 3 }).setOrigin(.5);
    button.on("pointerover", () => button.setFillStyle(0x28627e, 1));
    button.on("pointerout", () => button.setFillStyle(0x193b50, .98));
    button.on("pointerdown", () => this.showCreditsDebugPanel());
  }

  private makeTraumaRadioShortcut() {
    const button = this.add.rectangle(170, 699, 276, 34, 0x5b1725, .98).setStrokeStyle(2, 0xff6a82, 1).setInteractive({ useHandCursor: true });
    this.add.circle(58, 699, 5, 0xff233f, 1);
    this.add.text(170, 699, "TRAUMA RADIO  •  LIVE", { fontFamily: "Arial Black", fontSize: "12px", color: "#ffe3e8", stroke: "#21050a", strokeThickness: 3 }).setOrigin(.5);
    button.on("pointerover", () => button.setFillStyle(0x8b263a, 1));
    button.on("pointerout", () => button.setFillStyle(0x5b1725, .98));
    button.on("pointerdown", () => this.scene.start("radio"));
  }

  private makeResetButton() {
    const button = this.add.rectangle(640, 699, 190, 34, 0x252126, .98).setStrokeStyle(2, 0x8d7b83, 1).setInteractive({ useHandCursor: true });
    this.add.text(640, 699, "RESET GAME", { fontFamily: "Arial Black", fontSize: "11px", color: "#e7dde1" }).setOrigin(.5);
    button.on("pointerover", () => button.setFillStyle(0x4a333d, 1));
    button.on("pointerout", () => button.setFillStyle(0x252126, .98));
    button.on("pointerdown", () => this.showResetPrompt());
  }

  private showResetPrompt() {
    const { width, height } = this.scale;
    const overlay = this.add.container(0, 0).setDepth(100);
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x010202, .9).setInteractive();
    const panel = this.add.rectangle(width / 2, height / 2, 610, 300, 0x111416, 1).setStrokeStyle(3, 0xbe8798, 1);
    const title = this.add.text(width / 2, height / 2 - 92, "RESET THE ENTIRE GAME?", { fontFamily: "Arial Black", fontSize: "27px", color: "#fff0f3" }).setOrigin(.5);
    const copy = this.add.text(width / 2, height / 2 - 35, "All healed chapters, bonus memories, and your profile choice\nwill be erased on this device.", { fontFamily: "Georgia", fontSize: "18px", color: "#cfc3c7", align: "center", lineSpacing: 7 }).setOrigin(.5);
    const confirm = this.add.rectangle(width / 2 - 145, height / 2 + 78, 240, 58, 0x74253d, 1).setStrokeStyle(2, 0xef9eb7, 1).setInteractive({ useHandCursor: true });
    const cancel = this.add.rectangle(width / 2 + 145, height / 2 + 78, 240, 58, 0x28322f, 1).setStrokeStyle(2, 0x8eaaa1, 1).setInteractive({ useHandCursor: true });
    const confirmText = this.add.text(width / 2 - 145, height / 2 + 78, "YES, RESET", { fontFamily: "Arial Black", fontSize: "15px", color: "#fff" }).setOrigin(.5);
    const cancelText = this.add.text(width / 2 + 145, height / 2 + 78, "KEEP MY PROGRESS", { fontFamily: "Arial Black", fontSize: "13px", color: "#e8f1ed" }).setOrigin(.5);
    confirm.on("pointerdown", () => { resetGameState(); this.scene.restart(); });
    cancel.on("pointerdown", () => overlay.destroy(true));
    overlay.add([shade, panel, title, copy, confirm, cancel, confirmText, cancelText]);
  }

  private showCreditsDebugPanel() {
    const { width, height } = this.scale;
    const overlay = this.add.container(0, 0).setDepth(80);
    const items: Phaser.GameObjects.GameObject[] = [];
    items.push(this.add.rectangle(width / 2, height / 2, width, height, 0x010306, .91).setInteractive());
    items.push(this.add.rectangle(width / 2, height / 2, 1220, 620, 0x0b1117, .99).setStrokeStyle(3, 0x75cce8, .9));
    items.push(this.add.text(width / 2, 64, "CHAPTER 6 END-CREDIT DEBUG GALLERY", { fontFamily: "Arial Black", fontSize: "27px", color: "#e7f9ff", stroke: "#000", strokeThickness: 6 }).setOrigin(.5));
    items.push(this.add.text(width / 2, 98, "Open any shot instantly, or play the complete timed sequence.", { fontFamily: "Georgia", fontSize: "17px", color: "#a9c7d2" }).setOrigin(.5));
    CHAPTER_SIX_CREDIT_BEATS.forEach((beat, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 180 + col * 305;
      const y = 175 + row * 112;
      const card = this.add.rectangle(x, y, 280, 78, beat.horror ? 0x40151c : 0x233b35, .98).setStrokeStyle(2, beat.horror ? 0xd56670 : 0x8dc9b3, 1).setInteractive({ useHandCursor: true });
      const number = this.add.text(x - 121, y - 26, `${i + 1}`.padStart(2, "0"), { fontFamily: "Arial Black", fontSize: "12px", color: beat.horror ? "#ff98a0" : "#aadcca" });
      const title = this.add.text(x, y - 8, beat.title, { fontFamily: "Arial Black", fontSize: "13px", color: "#ffffff", align: "center", wordWrap: { width: 245 } }).setOrigin(.5);
      const mode = this.add.text(x, y + 20, beat.horror ? "ORGAN HORROR" : "SINGING / HEALING", { fontFamily: "Arial Black", fontSize: "9px", color: beat.horror ? "#e87982" : "#82bba6" }).setOrigin(.5);
      card.on("pointerdown", () => this.scene.start("chapter6credits", { debugBeat: i }));
      items.push(card, number, title, mode);
    });
    const full = this.add.rectangle(width / 2 - 180, 535, 330, 54, 0x5d2c66, 1).setStrokeStyle(2, 0xd9a9df, 1).setInteractive({ useHandCursor: true });
    const boss = this.add.rectangle(width / 2 + 180, 535, 330, 54, 0x4b2b28, 1).setStrokeStyle(2, 0xe1a38e, 1).setInteractive({ useHandCursor: true });
    const close = this.add.text(width / 2, 610, "CLOSE DEBUG GALLERY", { fontFamily: "Arial Black", fontSize: "13px", color: "#93a8b0" }).setOrigin(.5).setInteractive({ useHandCursor: true });
    items.push(full, this.add.text(width / 2 - 180, 535, "PLAY FULL END CREDITS", { fontFamily: "Arial Black", fontSize: "14px", color: "#fff" }).setOrigin(.5));
    items.push(boss, this.add.text(width / 2 + 180, 535, "START FINAL BOSS", { fontFamily: "Arial Black", fontSize: "14px", color: "#fff" }).setOrigin(.5), close);
    full.on("pointerdown", () => this.scene.start("chapter6credits"));
    boss.on("pointerdown", () => this.scene.start("chapter6"));
    close.on("pointerdown", () => overlay.destroy(true));
    overlay.add(items);
  }

  private showGenderPrompt() {
    const { width, height } = this.scale;
    const overlay = this.add.container(0, 0).setDepth(50);
    const block = this.add.rectangle(width / 2, height / 2, width, height, 0x010202, .86).setInteractive();
    const panel = this.add.rectangle(width / 2, height / 2, 790, 330, 0x111816, .99).setStrokeStyle(3, 0xd5c18f, .95);
    const title = this.add.text(width / 2, height / 2 - 117, "WHO IS REENTERING THE MEMORY?", { fontFamily: "Arial Black", fontSize: "24px", color: "#fff2d0" }).setOrigin(.5);
    const copy = this.add.text(width / 2, height / 2 - 66, "This tailors the healing affirmation at the end.", { fontFamily: "Georgia", fontSize: "18px", color: "#c8d0cb" }).setOrigin(.5);
    const makeChoice = (x: number, label: string, value: PlayerGender) => {
      const button = this.add.rectangle(x, height / 2 + 31, 210, 82, 0x6d2a24, 1).setStrokeStyle(3, 0xe8d29c, 1).setInteractive({ useHandCursor: true });
      const text = this.add.text(x, height / 2 + 31, label, { fontFamily: "Arial Black", fontSize: "22px", color: "#fff2d6" }).setOrigin(.5);
      button.on("pointerdown", () => { localStorage.setItem(PROFILE_KEY, value); this.gender = value; overlay.destroy(true); this.scene.restart(); });
      return [button, text];
    };
    const male = makeChoice(width / 2 - 240, "MALE", "male");
    const female = makeChoice(width / 2, "FEMALE", "female");
    const nonbinary = makeChoice(width / 2 + 240, "NON-BINARY", "nonbinary");
    const note = this.add.text(width / 2, height / 2 + 111, "Saved only on this device. You can change it anytime.", { fontFamily: "Georgia", fontSize: "14px", color: "#87918c" }).setOrigin(.5);
    overlay.add([block, panel, title, copy, ...male, ...female, ...nonbinary, note]);
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
  private blockButton!: Phaser.GameObjects.Container;
  private blockShield!: Phaser.GameObjects.Ellipse;
  private blocking = false;
  private timerText!: Phaser.GameObjects.Text;
  private fightMusic!: Phaser.Sound.BaseSound;
  private winningMusic!: Phaser.Sound.BaseSound;
  private failureMusic!: Phaser.Sound.BaseSound;
  private firstBloodCalled = false;
  private hitStreak = 0;
  private called30 = false;
  private called10 = false;
  private announcerBanner?: Phaser.GameObjects.Text;

  constructor() { super("chapter2"); }

  init() {
    this.battle = { motherHealth: 100, rexHealth: 100 };
    this.started = false;
    this.ended = false;
    this.remainingTime = 45;
    this.pressTimes = [];
    this.attackClock = 1450;
    this.firstBloodCalled = false;
    this.hitStreak = 0;
    this.called30 = false;
    this.called10 = false;
    this.blocking = false;
  }

  preload() {
    this.load.image("chapter2-arena", "assets/chapter2-volcanic-arena.png");
    this.load.image("chapter2-mother", "assets/chapter2-mother.png");
    this.load.image("chapter2-rex", "assets/chapter2-rex.png");
    this.load.image("chapter2-mother-windup", "assets/chapter2-mother-windup.png");
    this.load.image("chapter2-mother-strike", "assets/chapter2-mother-strike.png");
    this.load.image("chapter2-rex-windup", "assets/chapter2-rex-windup.png");
    this.load.image("chapter2-rex-bite", "assets/chapter2-rex-bite.png");
    this.load.image("chapter2-victory", "assets/chapter2-sunset-victory.png");
    this.load.image("chapter2-failure", "assets/chapter2-failure-rain.png");
    this.load.audio("chapter2-fight-music", "assets/chapter2-fight-cover.mp3");
    this.load.audio("chapter2-winning-music", "assets/chapter2-winning-cover.mp3");
    this.load.audio("chapter2-failure-music", "assets/chapter2-failure-cover.mp3");
    this.load.spritesheet("blood-squirt-right", "assets/blood-squirt-right.png", { frameWidth: 512, frameHeight: 512 });
    this.load.audio("sfx-failed", "assets/sfx-failed.wav");
    this.load.audio("sfx-firstblood", "assets/sfx-firstblood.wav");
    this.load.audio("sfx-dominating", "assets/sfx-dominating.wav");
    this.load.audio("sfx-cd30", "assets/sfx-cd30.wav");
    this.load.audio("sfx-cd10", "assets/sfx-cd10.wav");
    this.load.audio("sfx-ultrakill", "assets/sfx-ultrakill.wav");
    this.load.audio("sfx-winner", "assets/sfx-winner.wav");
    this.load.audio("sfx-lostmatch", "assets/sfx-lostmatch.wav");
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
    this.add.text(30, 86, "Three rapid presses swing her tail. Hold BLOCK to survive.", { fontFamily: "Georgia", fontSize: "16px", color: "#dbc9b1" });
    this.timerText = this.add.text(width - 28, 23, "00:45", { fontFamily: "Arial Black", fontSize: "32px", color: "#ffe5b5", stroke: "#230000", strokeThickness: 6 }).setOrigin(1, 0);
    this.add.text(width - 28, 63, "FIGHT ENDS AT 03:15", { fontFamily: "Arial Black", fontSize: "11px", color: "#c9ae82" }).setOrigin(1, 0);

    this.makeHealthMeter(28, 128, "SHARPTOOTH", 0xb72222);
    this.rexBar = this.add.rectangle(30, 158, 410, 20, 0xb72222).setOrigin(0, .5);
    this.makeHealthMeter(width - 440, 128, "LITTLEFOOT'S MOM", 0x69a75b);
    this.motherBar = this.add.rectangle(width - 438, 158, 410, 20, 0x69a75b).setOrigin(0, .5);

    this.status = this.add.text(width / 2, 543, "PRESS TO BEGIN — YOU HAVE 45 SECONDS", { fontFamily: "Arial Black", fontSize: "19px", color: "#fff0ce", stroke: "#210000", strokeThickness: 5 }).setOrigin(.5);
    this.comboText = this.add.text(width / 2, 574, "TAIL FORCE 0 / 3", { fontFamily: "Arial Black", fontSize: "14px", color: "#e4bd75", stroke: "#000", strokeThickness: 4 }).setOrigin(.5);
    this.strikeButton = this.makeStrikeButton(width / 2 - 115, 650);
    this.blockButton = this.makeBlockButton(width / 2 + 115, 650);
    this.blockShield = this.add.ellipse(730, 407, 240, 390, 0x5eb6d9, .08).setStrokeStyle(8, 0x9ee8ff, .82).setAlpha(0).setDepth(12);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", () => this.press());
    const blockKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    blockKey.on("down", () => this.setBlocking(true));
    blockKey.on("up", () => this.setBlocking(false));
    this.input.keyboard!.on("keydown-M", () => this.scene.start("menu"));
    this.fightMusic = this.sound.add("chapter2-fight-music");
    this.winningMusic = this.sound.add("chapter2-winning-music");
    this.failureMusic = this.sound.add("chapter2-failure-music");
    if (!this.anims.exists("blood-squirt-right-animation")) {
      this.anims.create({ key: "blood-squirt-right-animation", frames: this.anims.generateFrameNumbers("blood-squirt-right", { start: 0, end: 15 }), frameRate: 26, repeat: 0 });
    }
    addAlwaysAvailableMenuButton(this);
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

  private makeBlockButton(x: number, y: number) {
    const ring = this.add.circle(0, 0, 55, 0x071116, .95).setStrokeStyle(5, 0x78d7ee, 1);
    const core = this.add.circle(0, 0, 42, 0x245f70, 1).setStrokeStyle(3, 0xc6f5ff, 1).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, -7, "BLOCK", { fontFamily: "Arial Black", fontSize: "18px", color: "#e9fbff", stroke: "#000", strokeThickness: 4 }).setOrigin(.5);
    const hint = this.add.text(0, 18, "HOLD / B", { fontFamily: "Arial Black", fontSize: "8px", color: "#bcebf4" }).setOrigin(.5);
    core.on("pointerdown", () => this.setBlocking(true));
    core.on("pointerup", () => this.setBlocking(false));
    core.on("pointerout", () => this.setBlocking(false));
    return this.add.container(x, y, [ring, core, label, hint]);
  }

  private beginFight() {
    if (this.started) return;
    this.started = true;
    this.fightMusic.play({ volume: .52, seek: 150 });
    this.status.setText("ATTACK OR HOLD BLOCK — SURVIVE 45 SECONDS");
  }

  private setBlocking(active: boolean) {
    if (this.ended) return;
    if (active) this.beginFight();
    this.blocking = active;
    this.blockShield?.setAlpha(active ? .88 : 0);
    this.blockButton?.setScale(active ? .9 : 1);
    if (active) this.status.setText("BLOCKING — HOLD YOUR GROUND");
  }

  private press() {
    if (this.ended) return;
    this.beginFight();
    const now = this.time.now;
    this.pressTimes = this.pressTimes.filter(t => now - t <= 750);
    this.pressTimes.push(now);
    this.comboText.setText(`TAIL FORCE ${Math.min(this.pressTimes.length, 3)} / 3`);
    this.tweens.add({ targets: this.strikeButton, scale: .87, duration: 55, yoyo: true });
    if (this.pressTimes.length < 3) return;
    this.pressTimes = [];
    this.battle = tailStrike(this.battle);
    this.announceFirstBlood();
    this.hitStreak += 1;
    if (this.hitStreak === 3 && this.battle.rexHealth > 0) {
      this.playAnnouncer("sfx-dominating");
      this.showAnnouncerBanner("DOMINATING", "#ffb52e");
    }
    this.attackClock += 420;
    this.status.setText("TAIL STRIKE! KEEP THE RHYTHM!");
    this.comboText.setText("TAIL FORCE 0 / 3");
    this.animateTailWhip();
    this.tweens.add({ targets: this.rex, x: this.rex.x - 105, y: this.rex.y - 18, angle: -9, duration: 210, yoyo: true, ease: "Back.out" });
    this.cameras.main.flash(90, 255, 185, 70, false);
    this.cameras.main.shake(210, .014);
    this.throwDebris(530, 430);
    this.updateBattleUI();
  }

  update(_time: number, delta: number) {
    if (this.ended || !this.started) return;
    this.remainingTime = Math.max(0, this.remainingTime - delta / 1000);
    this.timerText.setText(`00:${Math.ceil(this.remainingTime).toString().padStart(2, "0")}`);
    if (!this.called30 && this.remainingTime <= 30) {
      this.called30 = true;
      this.playAnnouncer("sfx-cd30");
      this.showAnnouncerBanner("30 SECONDS REMAIN", "#ffd075");
    }
    if (!this.called10 && this.remainingTime <= 10) {
      this.called10 = true;
      this.playAnnouncer("sfx-cd10");
      this.showAnnouncerBanner("10 SECONDS REMAIN", "#ff6655");
    }
    if (this.remainingTime <= 0) {
      this.status.setText("SHE SURVIVED — YOU HELD ON!");
      this.finish(true, false);
      return;
    }
    const now = this.time.now;
    this.pressTimes = this.pressTimes.filter(t => now - t <= 750);
    this.comboText.setText(`TAIL FORCE ${Math.min(this.pressTimes.length, 3)} / 3`);
    this.attackClock -= delta;
    if (this.attackClock <= 0) this.predatorAttack();
  }

  private predatorAttack() {
    this.attackClock = Phaser.Math.Between(1150, 1500);
    const blocked = this.blocking;
    if (!blocked) {
      this.battle = rexAttack(this.battle);
      this.announceFirstBlood();
      this.hitStreak = 0;
      this.status.setText("HE BITES — FIGHT BACK FASTER!");
    } else {
      this.status.setText("BLOCKED! SHE HOLDS HER GROUND!");
      this.cameras.main.flash(90, 90, 205, 255, false);
    }
    const rexStart = this.rex.x;
    this.rex.setTexture("chapter2-rex-windup").setDisplaySize(650, 366);
    this.time.delayedCall(115, () => {
      this.rex.setTexture("chapter2-rex-bite").setDisplaySize(650, 366);
      this.tweens.add({ targets: this.rex, x: rexStart + 190, y: this.rex.y - 8, duration: 155, hold: 140, yoyo: true, ease: "Power3", onYoyo: () => blocked ? this.blockShield.setScale(1.16) : this.sprayBlood(665, 385), onComplete: () => { this.rex.setTexture("chapter2-rex").setDisplaySize(650, 366); this.blockShield.setScale(1); } });
    });
    if (!blocked) {
      this.tweens.add({ targets: this.mother, x: this.mother.x + 52, angle: 4, tint: 0xb72c24, duration: 105, hold: 120, yoyo: true, ease: "Back.out", onComplete: () => this.mother.clearTint() });
      this.cameras.main.flash(135, 145, 0, 0, false);
      this.cameras.main.shake(300, .02);
    } else {
      this.cameras.main.shake(120, .006);
    }
    this.updateBattleUI();
  }

  private updateBattleUI() {
    this.rexBar.width = 410 * this.battle.rexHealth / 100;
    this.motherBar.width = 410 * this.battle.motherHealth / 100;
    const outcome = battleOutcome(this.battle);
    if (outcome !== "fighting") this.finish(outcome === "won", outcome === "won");
  }

  private finish(won: boolean, deathBlow = false) {
    this.ended = true;
    this.fightMusic.stop();
    if (won) localStorage.setItem(CHAPTER_TWO_HEALED_KEY, "true");
    this.tweens.killTweensOf([this.rex, this.mother]);
    if (won) {
      this.tweens.add({ targets: this.rex, x: -220, angle: -18, alpha: .15, duration: 1300, ease: "Quad.in" });
      this.tweens.add({ targets: this.mother, x: this.mother.x - 55, duration: 700, ease: "Back.out" });
    } else {
      this.tweens.add({ targets: this.mother, y: this.mother.y + 190, angle: 8, alpha: .2, duration: 1500, ease: "Quad.in" });
    }
    if (won) {
      const announceWin = () => {
        this.showAnnouncerBanner("YOU WON", "#ffe08a");
        this.playAnnouncer("sfx-winner", () => {
          this.winningMusic.play({ volume: .58 });
          this.showBattleEnding(true);
        });
      };
      if (deathBlow) {
        this.showAnnouncerBanner("ULTRAKILL", "#ff2b20");
        this.playAnnouncer("sfx-ultrakill", announceWin);
      } else {
        this.showAnnouncerBanner("SURVIVOR", "#8ee8ff");
        this.time.delayedCall(750, announceWin);
      }
    } else {
      this.showAnnouncerBanner("FAILED", "#d9d9d9");
      this.playAnnouncer("sfx-failed", () => {
        this.showAnnouncerBanner("MATCH LOST", "#c7b9b4");
        this.playAnnouncer("sfx-lostmatch", () => this.showBattleEnding(false));
      });
    }
  }

  private showBattleEnding(won: boolean) {
    const { width, height } = this.scale;
    if (won) {
      this.add.image(width / 2, height / 2, "chapter2-victory").setDisplaySize(width, height).setDepth(20);
      this.add.rectangle(width / 2, 80, width, 160, 0x1b0903, .68).setDepth(21);
      this.add.rectangle(width / 2, height - 80, width, 160, 0x1b0903, .52).setDepth(21);
    } else {
      this.add.image(width / 2, height / 2, "chapter2-failure").setDisplaySize(width, height).setDepth(20);
      this.add.rectangle(width / 2, height / 2, width, height, 0x02060d, .06).setDepth(21);
      this.add.rectangle(width / 2, height / 2, 680, 330, 0x04070b, .38).setDepth(21);
      this.failureMusic.play({ volume: .58, seek: 11, loop: true });
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

  private animateTailWhip() {
    const trail = this.add.graphics().setDepth(this.mother.depth + 1);
    trail.lineStyle(18, 0xff9b3d, .48).beginPath().arc(790, 430, 285, 3.45, 5.05, false).strokePath();
    trail.lineStyle(7, 0xffe1a0, .8).beginPath().arc(790, 430, 250, 3.4, 5.0, false).strokePath();
    const startX = this.mother.x;
    this.mother.setTexture("chapter2-mother-windup").setDisplaySize(720, 480).setAngle(3);
    this.time.delayedCall(105, () => {
      this.mother.setTexture("chapter2-mother-strike").setDisplaySize(720, 480).setAngle(-5);
      this.tweens.add({ targets: this.mother, x: startX - 78, duration: 105, hold: 80, yoyo: true, ease: "Expo.out", onComplete: () => this.mother.setTexture("chapter2-mother").setDisplaySize(720, 480).setAngle(0) });
    });
    this.tweens.add({ targets: trail, alpha: 0, duration: 330, onComplete: () => trail.destroy() });
  }

  private sprayBlood(x: number, y: number) {
    const squirt = this.add.sprite(x - 8, y - 4, "blood-squirt-right", 0).setOrigin(.17, .5).setScale(.58).setDepth(17).setAngle(-7);
    squirt.play("blood-squirt-right-animation");
    squirt.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => squirt.destroy());
    for (let i = 0; i < 34; i++) {
      const size = Phaser.Math.Between(3, 11);
      const drop = this.add.ellipse(x, y, size, size * Phaser.Math.FloatBetween(.45, 1.7), i % 5 === 0 ? 0x6b0505 : 0xc41414, Phaser.Math.FloatBetween(.72, 1)).setDepth(15).setRotation(Phaser.Math.FloatBetween(0, 3));
      this.tweens.add({ targets: drop, x: x + Phaser.Math.Between(-150, 120), y: y + Phaser.Math.Between(-135, 100), angle: Phaser.Math.Between(-220, 220), scale: Phaser.Math.FloatBetween(.45, 1.5), alpha: 0, duration: Phaser.Math.Between(520, 880), ease: "Quad.out", onComplete: () => drop.destroy() });
    }
    const wound = this.add.ellipse(x + 34, y + 8, 72, 28, 0x8f0909, .72).setDepth(14).setRotation(-.25);
    this.tweens.add({ targets: wound, alpha: 0, scaleX: 1.45, duration: 900, onComplete: () => wound.destroy() });
  }

  private announceFirstBlood() {
    if (this.firstBloodCalled) return;
    this.firstBloodCalled = true;
    this.playAnnouncer("sfx-firstblood");
    this.showAnnouncerBanner("FIRST BLOOD", "#ff3c2f");
  }

  private playAnnouncer(key: string, onComplete?: () => void) {
    const sound = this.sound.add(key, { volume: .95 });
    sound.once(Phaser.Sound.Events.COMPLETE, () => { onComplete?.(); sound.destroy(); });
    sound.play();
  }

  private showAnnouncerBanner(message: string, color: string) {
    this.announcerBanner?.destroy();
    const banner = this.add.text(this.scale.width / 2, 238, message, { fontFamily: "Arial Black", fontSize: "43px", color, stroke: "#180000", strokeThickness: 9, letterSpacing: 3 }).setOrigin(.5).setDepth(40).setScale(.45).setAlpha(0);
    this.announcerBanner = banner;
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 140, ease: "Back.out", hold: 700, yoyo: true, onComplete: () => { banner.destroy(); if (this.announcerBanner === banner) this.announcerBanner = undefined; } });
  }
}

class ChapterThreeRescue extends Phaser.Scene {
  private rescue: DipRescueState = { distance: 0, time: DIP_RESCUE_SECONDS, danger: 0 };
  private started = false;
  private ended = false;
  private runner!: Phaser.GameObjects.Image;
  private toon!: Phaser.GameObjects.Image;
  private judge!: Phaser.GameObjects.Image;
  private judgeArm!: Phaser.GameObjects.Graphics;
  private distanceBar!: Phaser.GameObjects.Rectangle;
  private dangerBar!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private runButton!: Phaser.GameObjects.Container;
  private music!: Phaser.Sound.BaseSound;
  private failureMusic!: Phaser.Sound.BaseSound;
  private winningMusic!: Phaser.Sound.BaseSound;

  constructor() { super("chapter3"); }

  init() {
    this.rescue = { distance: 0, time: DIP_RESCUE_SECONDS, danger: 0 };
    this.started = false;
    this.ended = false;
  }

  preload() {
    this.load.image("chapter3-factory", "assets/chapter3-dip-factory.png");
    this.load.image("chapter3-runner", "assets/chapter3-runner.png");
    this.load.image("chapter3-toon", "assets/chapter3-shoe-hand.png");
    this.load.image("chapter3-judge", "assets/chapter3-judge-v3.png");
    this.load.image("chapter3-victory", "assets/chapter3-victory-shoe.png");
    this.load.audio("chapter3-music", "assets/chapter3-dip-music.mp3");
    this.load.audio("chapter3-failed-music", "assets/chapter3-failed.mp3");
    this.load.audio("chapter3-winning-music", "assets/chapter3-winning.mp3");
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "chapter3-factory").setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x03100a, .08);
    this.makeDipMist();

    this.runner = this.add.image(92, 507, "chapter3-runner").setDisplaySize(268, 179).setDepth(8);
    this.judge = this.add.image(1140, 220, "chapter3-judge").setDisplaySize(260, 390).setDepth(5);
    this.judgeArm = this.add.graphics().setDepth(6);
    this.toon = this.add.image(1180, 355, "chapter3-toon").setDisplaySize(132, 198).setDepth(7);
    this.drawJudgeArm();

    this.add.rectangle(width / 2, 66, width, 132, 0x020806, .86).setDepth(10);
    this.add.text(28, 14, "CHAPTER 3", { fontFamily: "Arial Black", fontSize: "17px", color: "#8bdc82", stroke: "#000", strokeThickness: 4 }).setDepth(11);
    this.add.text(28, 39, "SAVE THE TOON FROM THE DIP", { fontFamily: "Arial Black", fontSize: "31px", color: "#efffd9", stroke: "#001b08", strokeThickness: 7 }).setDepth(11);
    this.add.text(30, 86, "Hit RUN fast enough to stop the judge from lowering the toon into the vat.", { fontFamily: "Georgia", fontSize: "16px", color: "#d2e4cc" }).setDepth(11);
    this.timerText = this.add.text(width - 28, 19, "00:22", { fontFamily: "Arial Black", fontSize: "34px", color: "#b9ff9c", stroke: "#001c08", strokeThickness: 7 }).setOrigin(1, 0).setDepth(11);
    this.add.text(width - 28, 66, "40 PRESSES TO REWRITE IT", { fontFamily: "Arial Black", fontSize: "12px", color: "#88b987" }).setOrigin(1, 0).setDepth(11);

    this.makeMeter(28, 126, "DISTANCE CLOSED", 0xd69d45);
    this.distanceBar = this.add.rectangle(30, 158, 330, 20, 0xe8b04f).setOrigin(0, .5).setDepth(11);
    this.distanceBar.width = 0;
    this.makeMeter(width - 360, 126, "DIP DANGER", 0x55f12f);
    this.dangerBar = this.add.rectangle(width - 358, 158, 330, 20, 0x55f12f).setOrigin(0, .5).setDepth(11);
    this.dangerBar.width = 0;

    this.status = this.add.text(width / 2, 559, "PRESS RUN TO BEGIN", { fontFamily: "Arial Black", fontSize: "20px", color: "#f3ffe8", stroke: "#001807", strokeThickness: 6 }).setOrigin(.5).setDepth(12);
    this.distanceText = this.add.text(width / 2, 588, "100 METERS AWAY", { fontFamily: "Arial Black", fontSize: "13px", color: "#bdddac", stroke: "#001807", strokeThickness: 4 }).setOrigin(.5).setDepth(12);
    this.runButton = this.makeRunButton(width / 2, 658);
    this.music = this.sound.add("chapter3-music", { volume: .56 });
    this.failureMusic = this.sound.add("chapter3-failed-music", { volume: .62 });
    this.winningMusic = this.sound.add("chapter3-winning-music", { volume: .62 });

    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", () => this.pressRun());
    this.input.keyboard!.on("keydown-M", () => this.scene.start("menu"));
    addAlwaysAvailableMenuButton(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sound.stopAll());
  }

  update(time: number, delta: number) {
    if (this.ended) return;
    this.toon.setAngle(Math.sin(time / 430) * 1.7);
    this.drawJudgeArm();
    if (!this.started) return;
    this.rescue = stepDipRescue(this.rescue, delta / 1000);
    this.updateRescueUI();
    const outcome = dipRescueOutcome(this.rescue);
    if (outcome !== "running") this.finish(outcome === "won");
  }

  private makeMeter(x: number, y: number, label: string, color: number) {
    this.add.text(x, y - 21, label, { fontFamily: "Arial Black", fontSize: "13px", color: "#e9f1df", stroke: "#000", strokeThickness: 4 }).setDepth(11);
    this.add.rectangle(x, y + 32, 334, 24, 0x061008, .96).setOrigin(0, .5).setStrokeStyle(2, color, .9).setDepth(11);
  }

  private makeRunButton(x: number, y: number) {
    const pulse = this.add.circle(0, 0, 58, 0x09200d, .9).setStrokeStyle(5, 0x8dff67, 1);
    const core = this.add.circle(0, 0, 45, 0x28752b, 1).setStrokeStyle(3, 0xe6ffd3, 1).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, -7, "RUN!", { fontFamily: "Arial Black", fontSize: "21px", color: "#f3ffe6", stroke: "#001405", strokeThickness: 5 }).setOrigin(.5);
    const hint = this.add.text(0, 18, "CLICK / SPACE", { fontFamily: "Arial Black", fontSize: "8px", color: "#d0f3c1" }).setOrigin(.5);
    core.on("pointerdown", () => this.pressRun());
    this.tweens.add({ targets: pulse, scale: 1.1, alpha: .55, duration: 480, yoyo: true, repeat: -1 });
    return this.add.container(x, y, [pulse, core, label, hint]).setDepth(12);
  }

  private pressRun() {
    if (this.ended) return;
    if (!this.started) {
      this.started = true;
      this.music.play({ seek: 195 });
      this.status.setText("RUN — DON'T LET THE CAGE REACH THE DIP!");
    }
    this.rescue = tapRun(this.rescue);
    this.runner.setX(92 + this.rescue.distance * 8.15);
    this.tweens.killTweensOf(this.runner);
    this.runner.setY(507).setAngle(0);
    this.tweens.add({ targets: this.runner, y: 495, angle: -2.5, duration: 80, yoyo: true, ease: "Quad.out" });
    this.tweens.add({ targets: this.runButton, scale: .86, duration: 55, yoyo: true });
    this.cameras.main.shake(55, .0018);
    this.updateRescueUI();
    if (dipRescueOutcome(this.rescue) === "won") this.finish(true);
  }

  private updateRescueUI() {
    this.timerText.setText(`00:${Math.ceil(this.rescue.time).toString().padStart(2, "0")}`);
    this.distanceBar.width = 330 * this.rescue.distance / 100;
    this.dangerBar.width = 330 * this.rescue.danger / 100;
    this.toon.setY(355 + this.rescue.danger * 1.2);
    this.drawJudgeArm();
    const meters = Math.max(0, Math.ceil(100 - this.rescue.distance));
    this.distanceText.setText(meters > 0 ? `${meters} METERS AWAY` : "REACH THE SHOE!");
    if (this.rescue.time <= 7 && !this.ended) {
      this.timerText.setColor("#ff675c");
      this.status.setText("THE DIP IS RIGHT BELOW THE SHOE — RUN!");
    }
  }

  private finish(won: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.music.stop();
    this.runButton.setAlpha(.35);
    this.tweens.killTweensOf([this.runner, this.toon]);
    if (won) {
      localStorage.setItem(CHAPTER_THREE_HEALED_KEY, "true");
      this.status.setText("YOU REACHED IT — GRAB THE SHOE!");
      this.cameras.main.flash(180, 220, 255, 190, false);
      this.tweens.add({ targets: this.runner, x: 960, y: 490, duration: 500, ease: "Power2" });
      this.tweens.add({ targets: this.toon, y: 235, x: 1040, angle: 0, duration: 700, ease: "Back.out" });
      this.tweens.add({ targets: this.judge, x: 1325, alpha: .22, duration: 760, ease: "Quad.in" });
      this.tweens.add({ targets: this.judgeArm, alpha: 0, duration: 650 });
    } else {
      this.status.setText("THE SHOE REACHED THE DIP");
      this.cameras.main.flash(320, 70, 255, 45, false);
      this.cameras.main.shake(600, .018);
      this.tweens.add({ targets: this.toon, y: 550, alpha: .08, duration: 700, ease: "Quad.in" });
    }
    this.time.delayedCall(850, () => this.showEnding(won));
  }

  private showEnding(won: boolean) {
    const { width, height } = this.scale;
    (won ? this.winningMusic : this.failureMusic).play();
    if (won) {
      this.add.image(width / 2, height / 2, "chapter3-victory").setDisplaySize(width, height).setDepth(30);
      this.add.rectangle(width / 2, 78, width, 156, 0x06100a, .68).setDepth(31);
      this.add.rectangle(width / 2, height - 77, width, 154, 0x06100a, .6).setDepth(31);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0x021409, .73).setDepth(30);
      this.add.rectangle(width / 2, height / 2, 710, 330, 0x020706, .86).setStrokeStyle(3, 0x58d53f, .75).setDepth(31);
    }
    this.add.text(width / 2, won ? 30 : height / 2 - 96, won ? "THE TOON LIVES" : "TOO LATE", { fontFamily: "Arial Black", fontSize: won ? "46px" : "54px", color: won ? "#efffd4" : "#9eff7a", stroke: "#001708", strokeThickness: 8 }).setOrigin(.5, won ? 0 : .5).setDepth(32);
    this.add.text(width / 2, won ? 90 : height / 2 - 27, won ? "You reached the vat before the Dip did." : "The memory dissolves again. Run sooner.", { fontFamily: "Georgia", fontSize: "24px", color: "#ecf5df", stroke: "#001408", strokeThickness: 5 }).setOrigin(.5).setDepth(32);
    const buttonY = won ? height - 75 : height / 2 + 70;
    const button = this.add.rectangle(width / 2, buttonY, 294, 66, 0x296d2b, 1).setStrokeStyle(3, 0xcaffaa, 1).setInteractive({ useHandCursor: true }).setDepth(32);
    this.add.text(width / 2, buttonY, won ? "CONTINUE" : "TRY AGAIN", { fontFamily: "Arial Black", fontSize: "22px", color: "#f1ffe5", stroke: "#001205", strokeThickness: 5 }).setOrigin(.5).setDepth(33);
    button.on("pointerdown", () => won ? this.scene.start("chapter4") : this.scene.restart());
    this.add.text(width / 2, won ? height - 27 : height / 2 + 126, "M: CHAPTER SELECT", { fontFamily: "Arial Black", fontSize: "12px", color: "#c4d9ba", stroke: "#000", strokeThickness: 3 }).setOrigin(.5).setDepth(32);
  }

  private makeDipMist() {
    for (let i = 0; i < 32; i++) {
      const mist = this.add.circle(Phaser.Math.Between(930, 1260), Phaser.Math.Between(260, 560), Phaser.Math.Between(2, 7), 0x62ff3e, Phaser.Math.FloatBetween(.12, .42)).setDepth(4);
      this.tweens.add({ targets: mist, y: mist.y - Phaser.Math.Between(80, 180), x: mist.x + Phaser.Math.Between(-35, 35), alpha: 0, duration: Phaser.Math.Between(1200, 2600), delay: Phaser.Math.Between(0, 1800), repeat: -1 });
    }
  }

  private drawJudgeArm() {
    if (!this.judgeArm || !this.toon) return;
    this.judgeArm.clear();
    const shoulderX = 1212;
    const shoulderY = 278;
    const handX = this.toon.x;
    const handY = this.toon.y - 77;
    this.judgeArm.lineStyle(46, 0x050706, 1).beginPath().moveTo(shoulderX, shoulderY).lineTo(handX, handY).strokePath();
    this.judgeArm.lineStyle(5, 0x315c2d, .72).beginPath().moveTo(shoulderX - 10, shoulderY + 5).lineTo(handX - 6, handY + 5).strokePath();
  }
}

class ChapterFourRescue extends Phaser.Scene {
  private rescue: YellerRescueState = { elapsed: 0, time: YELLER_RESCUE_SECONDS, pace: 0, rawDistance: 0, distance: 0 };
  private started = false;
  private ended = false;
  private runner!: Phaser.GameObjects.Image;
  private distanceBar!: Phaser.GameObjects.Rectangle;
  private paceBar!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private runButton!: Phaser.GameObjects.Container;
  private mainMusic!: Phaser.Sound.BaseSound;
  private winningMusic!: Phaser.Sound.BaseSound;
  private failureMusic!: Phaser.Sound.BaseSound;

  constructor() { super("chapter4"); }

  init() {
    this.rescue = { elapsed: 0, time: YELLER_RESCUE_SECONDS, pace: 0, rawDistance: 0, distance: 0 };
    this.started = false;
    this.ended = false;
  }

  preload() {
    this.load.image("chapter4-farm", "assets/chapter4-farm.png");
    this.load.image("chapter4-runner", "assets/chapter4-runner.png");
    this.load.image("chapter4-victory", "assets/chapter4-victory.png");
    this.load.image("chapter4-failure-grave", "assets/chapter4-failure-grave.png");
    this.load.audio("chapter4-main-music", "assets/chapter4-main.mp3");
    this.load.audio("chapter4-winning-music", "assets/chapter4-winning.mp3");
    this.load.audio("chapter4-failure-music", "assets/chapter4-losing.mp3");
    this.load.audio("chapter4-shotgun", "assets/chapter4-shotgunblast.mp3");
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "chapter4-farm").setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x241407, .08);
    this.makeWind();
    this.runner = this.add.image(70, 494, "chapter4-runner").setDisplaySize(230, 201).setDepth(7);

    this.add.rectangle(width / 2, 66, width, 132, 0x100b06, .86).setDepth(10);
    this.add.text(28, 14, "CHAPTER 4", { fontFamily: "Arial Black", fontSize: "17px", color: "#e4b66f", stroke: "#000", strokeThickness: 4 }).setDepth(11);
    this.add.text(28, 39, "THE VACCINE RUN", { fontFamily: "Arial Black", fontSize: "31px", color: "#fff0cf", stroke: "#2a1304", strokeThickness: 7 }).setDepth(11);
    this.add.text(30, 86, "Keep running until 01:30. Reach the boy before he fires.", { fontFamily: "Georgia", fontSize: "16px", color: "#e3d2b7" }).setDepth(11);
    this.timerText = this.add.text(width - 28, 19, "01:30", { fontFamily: "Arial Black", fontSize: "34px", color: "#ffd28b", stroke: "#281200", strokeThickness: 7 }).setOrigin(1, 0).setDepth(11);
    this.add.text(width - 28, 66, "THE SHOT COMES WHEN TIME EXPIRES", { fontFamily: "Arial Black", fontSize: "11px", color: "#c8a77a" }).setOrigin(1, 0).setDepth(11);

    this.makeMeter(28, 126, "DISTANCE CLOSED", 0xe4a447);
    this.distanceBar = this.add.rectangle(30, 158, 330, 20, 0xe4a447).setOrigin(0, .5).setDepth(11);
    this.distanceBar.width = 0;
    this.makeMeter(width - 360, 126, "RUNNING PACE", 0x6ca85b);
    this.paceBar = this.add.rectangle(width - 358, 158, 330, 20, 0x79b963).setOrigin(0, .5).setDepth(11);
    this.paceBar.width = 0;

    this.status = this.add.text(width / 2, 559, "PRESS RUN TO BEGIN THE 90-SECOND SPRINT", { fontFamily: "Arial Black", fontSize: "19px", color: "#fff4dc", stroke: "#261000", strokeThickness: 6 }).setOrigin(.5).setDepth(12);
    this.distanceText = this.add.text(width / 2, 588, "THE VACCINE IS STILL 100 METERS AWAY", { fontFamily: "Arial Black", fontSize: "13px", color: "#ecd4ad", stroke: "#201000", strokeThickness: 4 }).setOrigin(.5).setDepth(12);
    this.runButton = this.makeRunButton(width / 2, 658);

    this.mainMusic = this.sound.add("chapter4-main-music", { volume: .62 });
    this.winningMusic = this.sound.add("chapter4-winning-music", { volume: .62 });
    this.failureMusic = this.sound.add("chapter4-failure-music", { volume: .62 });
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", () => this.pressRun());
    this.input.keyboard!.on("keydown-M", () => this.scene.start("menu"));
    addAlwaysAvailableMenuButton(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sound.stopAll());
  }

  update(time: number, delta: number) {
    if (this.ended || !this.started) return;
    this.rescue = stepYellerRescue(this.rescue, delta / 1000);
    const stride = this.rescue.pace / 100;
    this.runner.setX(70 + this.rescue.distance * 8.75);
    this.runner.setY(494 + Math.sin(time / 85) * 7 * stride).setAngle(Math.sin(time / 150) * 2.2 * stride);
    this.updateRescueUI();
    if (this.rescue.time <= 0) this.finish(yellerRescueOutcome(this.rescue) === "won");
  }

  private makeMeter(x: number, y: number, label: string, color: number) {
    this.add.text(x, y - 21, label, { fontFamily: "Arial Black", fontSize: "13px", color: "#f2e5cd", stroke: "#000", strokeThickness: 4 }).setDepth(11);
    this.add.rectangle(x, y + 32, 334, 24, 0x160f08, .96).setOrigin(0, .5).setStrokeStyle(2, color, .9).setDepth(11);
  }

  private makeRunButton(x: number, y: number) {
    const pulse = this.add.circle(0, 0, 58, 0x241507, .92).setStrokeStyle(5, 0xffc15e, 1);
    const core = this.add.circle(0, 0, 45, 0x8f4f18, 1).setStrokeStyle(3, 0xffe1a5, 1).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, -7, "RUN!", { fontFamily: "Arial Black", fontSize: "21px", color: "#fff4dc", stroke: "#281100", strokeThickness: 5 }).setOrigin(.5);
    const hint = this.add.text(0, 18, "CLICK / SPACE", { fontFamily: "Arial Black", fontSize: "8px", color: "#f2d2a0" }).setOrigin(.5);
    core.on("pointerdown", () => this.pressRun());
    this.tweens.add({ targets: pulse, scale: 1.1, alpha: .58, duration: 520, yoyo: true, repeat: -1 });
    return this.add.container(x, y, [pulse, core, label, hint]).setDepth(12);
  }

  private pressRun() {
    if (this.ended) return;
    if (!this.started) {
      this.started = true;
      this.mainMusic.play();
      this.status.setText("KEEP THE PACE — DON'T STOP RUNNING");
    }
    this.rescue = tapYellerRun(this.rescue);
    this.tweens.add({ targets: this.runButton, scale: .86, duration: 55, yoyo: true });
    this.cameras.main.shake(45, .0012);
    this.updateRescueUI();
  }

  private updateRescueUI() {
    const seconds = Math.ceil(this.rescue.time);
    this.timerText.setText(`${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`);
    this.distanceBar.width = 330 * this.rescue.distance / 100;
    this.paceBar.width = 330 * this.rescue.pace / 100;
    const meters = Math.max(0, Math.ceil(100 - this.rescue.distance));
    this.distanceText.setText(meters > 0 ? `${meters} METERS TO OLD YELLER` : "REACH THE BOY!");
    if (this.rescue.pace < 32 && this.rescue.elapsed > 2) {
      this.status.setText("YOU'RE LOSING SPEED — PRESS RUN!");
      this.paceBar.setFillStyle(0xc94b32);
    } else if (this.rescue.elapsed > 2) {
      this.status.setText("HOLD THIS PACE — THE VACCINE CAN SAVE HIM");
      this.paceBar.setFillStyle(0x79b963);
    }
    if (this.rescue.time <= 10) {
      this.timerText.setColor("#ff6654");
      this.status.setText("TEN SECONDS — DON'T LET HIM FIRE!");
    }
  }

  private finish(won: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.runButton.setAlpha(.35);
    this.tweens.killTweensOf(this.runner);
    if (won) {
      localStorage.setItem(CHAPTER_FOUR_HEALED_KEY, "true");
      this.mainMusic.stop();
      this.status.setText("YOU MADE IT — GIVE HIM THE VACCINE!");
      this.cameras.main.flash(220, 255, 225, 160, false);
      this.tweens.add({ targets: this.runner, x: 1040, y: 485, duration: 650, ease: "Power2" });
      this.time.delayedCall(900, () => this.showEnding(true));
    } else {
      this.status.setText("THE RIFLE FIRES");
      this.mainMusic.stop();
      this.sound.play("chapter4-shotgun", { volume: .95 });
      const flash = this.add.star(1130, 478, 8, 9, 34, 0xffe7a0, 1).setDepth(25);
      const blackout = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 1).setDepth(50).setAlpha(0);
      this.cameras.main.flash(160, 255, 244, 214, false);
      this.cameras.main.shake(550, .024);
      this.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
      this.time.delayedCall(180, () => blackout.setAlpha(1));
      this.time.delayedCall(3400, () => { blackout.destroy(); this.showEnding(false); });
    }
  }

  private showEnding(won: boolean) {
    const { width, height } = this.scale;
    if (won) {
      this.winningMusic.play();
      this.add.image(width / 2, height / 2, "chapter4-victory").setDisplaySize(width, height).setDepth(30);
      this.add.rectangle(width / 2, 78, width, 156, 0x1a1007, .65).setDepth(31);
      this.add.rectangle(width / 2, height - 77, width, 154, 0x1a1007, .62).setDepth(31);
    } else {
      this.failureMusic.play({ seek: 20, loop: true });
      this.add.image(width / 2, height / 2, "chapter4-failure-grave").setDisplaySize(width, height).setDepth(30);
      this.add.rectangle(width / 2, 70, width, 140, 0x030507, .72).setDepth(31);
      this.add.rectangle(width / 2, height - 122, width, 244, 0x030507, .67).setDepth(31);
    }
    this.add.text(width / 2, won ? 29 : height / 2 - 96, won ? "OLD YELLER LIVES" : "THE SHOT ECHOES AGAIN", { fontFamily: "Arial Black", fontSize: won ? "46px" : "44px", color: won ? "#fff0c9" : "#d8b997", stroke: "#2b1103", strokeThickness: 8 }).setOrigin(.5, won ? 0 : .5).setDepth(32);
    this.add.text(width / 2, won ? 89 : height / 2 - 28, won ? "The vaccine arrived. This time, the boy keeps his dog." : "You stopped running too soon. Get up and try again.", { fontFamily: "Georgia", fontSize: "23px", color: "#f3dfc0", stroke: "#1d0d04", strokeThickness: 5 }).setOrigin(.5).setDepth(32);
    const buttonY = won ? height - 75 : height / 2 + 70;
    const button = this.add.rectangle(width / 2, buttonY, 294, 66, 0x87501f, 1).setStrokeStyle(3, 0xffd58d, 1).setInteractive({ useHandCursor: true }).setDepth(32);
    this.add.text(width / 2, buttonY, won ? "CONTINUE" : "TRY AGAIN", { fontFamily: "Arial Black", fontSize: "22px", color: "#fff2d9", stroke: "#2a1000", strokeThickness: 5 }).setOrigin(.5).setDepth(33);
    button.on("pointerdown", () => won ? this.scene.start("chapter4bonus") : this.scene.restart());
    this.add.text(width / 2, won ? height - 27 : height / 2 + 126, "M: CHAPTER SELECT", { fontFamily: "Arial Black", fontSize: "12px", color: "#d9c2a1", stroke: "#000", strokeThickness: 3 }).setOrigin(.5).setDepth(32);
  }

  private makeWind() {
    for (let i = 0; i < 28; i++) {
      const seed = this.add.ellipse(Phaser.Math.Between(-100, 1280), Phaser.Math.Between(220, 650), Phaser.Math.Between(5, 12), 2, 0xe6c483, Phaser.Math.FloatBetween(.2, .55)).setDepth(4);
      this.tweens.add({ targets: seed, x: 1380, y: seed.y - Phaser.Math.Between(10, 55), alpha: 0, duration: Phaser.Math.Between(1800, 3800), delay: Phaser.Math.Between(0, 2500), repeat: -1 });
    }
  }
}

const CHAPTER_FOUR_HEALING_MOMENTS = [
  ["THE DEBT COLLECTOR", "Remember that $200 I borrowed in 2001? Here's $300 with interest.", "chapter4-bonus-debt"],
  ["THE FOOD SHARER", "Someone opens a bag of fries and immediately offers you some. The GOOD fries at the bottom.", "chapter4-bonus-fries"],
  ["THE EX-GIRLFRIEND", "Honestly, you were the best I ever had. I messed up.", "chapter4-bonus-ex"],
  ["THE GROUP PROJECT", "Every team member does their share of the work. Nobody needs reminding.", "chapter4-bonus-group-project"],
  ["THE LAST SLICE", "Everyone at the pizza party insists you take the last slice.", "chapter4-bonus-last-slice"],
  ["THE MECHANIC", "Actually, it was just a loose wire. No charge.", "chapter4-bonus-mechanic"],
  ["THE JOB INTERVIEW", "We reviewed your qualifications. You're overqualified, so we're offering you more money.", "chapter4-bonus-interview"],
  ["THE PARENT APOLOGY", "Mom says, ‘You were right. I should have listened.’ No excuses.", "chapter4-bonus-parent-apology"],
  ["THE SCHOOL BULLY", "I was insecure. You didn't deserve that.", "chapter4-bonus-bully"],
  ["THE RESTAURANT BILL", "Someone already paid for your meal. No strings attached.", "chapter4-bonus-restaurant"],
  ["THE TEXT MESSAGE", "Someone actually texts you first and asks how you're doing.", "chapter4-bonus-text"],
  ["THE PARTY INVITATION", "Friends invite you somewhere, and they genuinely want you there.", "chapter4-bonus-party"],
  ["THE BOSS", "You work too hard. Take Friday off. Paid.", "chapter4-bonus-boss"],
  ["THE BORROWED TOOL", "Your neighbor returns your socket set, cleaned, with every socket present.", "chapter4-bonus-tool"],
  ["THE ARGUMENT", "You know what? You were right. I'm sorry. No follow-up argument.", "chapter4-bonus-argument"],
  ["THE COMPLIMENT", "A stranger compliments your shirt, and they're not trying to sell you anything.", "chapter4-bonus-compliment"],
  ["THE MOVING DAY", "Six friends show up with trucks. Nobody suddenly has a back injury.", "chapter4-bonus-moving"],
  ["THE REFUND", "Customer service says, ‘You're absolutely right. Here's your money back.’", "chapter4-bonus-refund"],
  ["THE BEST FRIEND", "Your friend defends you when you're not in the room.", "chapter4-bonus-best-friend"],
  ["THE REUNION", "Your high school crush admits, ‘I actually had a huge crush on you back then.’", "chapter4-bonus-reunion"],
] as const;

function addCrtTelevision(scene: Phaser.Scene) {
  const { width, height } = scene.scale;
  const overlayDepth = 90;

  scene.add.rectangle(width / 2, height / 2, width, height, 0x173629, .09).setDepth(overlayDepth);
  const scanlines = scene.add.graphics().setDepth(overlayDepth + 1);
  scanlines.lineStyle(1, 0x050807, .2);
  for (let y = 2; y < height; y += 4) scanlines.lineBetween(0, y, width, y);

  const colorBleed = scene.add.graphics().setDepth(overlayDepth + 2);
  colorBleed.fillStyle(0xff244f, .055).fillRect(0, 0, 5, height);
  colorBleed.fillStyle(0x30bfff, .055).fillRect(width - 5, 0, 5, height);

  const roll = scene.add.rectangle(width / 2, -70, width - 54, 115, 0xd8fff0, .055).setDepth(overlayDepth + 2).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: roll, y: height + 80, duration: 4300, repeat: -1, ease: "Linear" });

  const bezel = scene.add.graphics().setDepth(overlayDepth + 5);
  bezel.fillStyle(0x15110d, 1).fillRect(0, 0, width, 23).fillRect(0, height - 25, width, 25).fillRect(0, 0, 25, height).fillRect(width - 25, 0, 25, height);
  bezel.lineStyle(9, 0x3f3428, 1).strokeRoundedRect(17, 15, width - 34, height - 30, 42);
  bezel.lineStyle(3, 0xb08a58, .52).strokeRoundedRect(25, 23, width - 50, height - 46, 35);
  bezel.lineStyle(2, 0x050403, .9).strokeRoundedRect(30, 28, width - 60, height - 56, 31);
  for (let i = 0; i < 14; i++) bezel.fillStyle(0x050403, .9).fillRoundedRect(430 + i * 31, height - 19, 18, 4, 2);

  scene.add.text(42, height - 19, "COLORTRON 1987", { fontFamily: "Arial Black", fontSize: "8px", color: "#9c825f" }).setOrigin(0, .5).setDepth(overlayDepth + 6);
  scene.add.text(width - 42, height - 19, "CH 03  •  MEMORY PLAYBACK", { fontFamily: "Courier New", fontStyle: "bold", fontSize: "8px", color: "#9c825f" }).setOrigin(1, .5).setDepth(overlayDepth + 6);

  const noise = scene.add.graphics().setDepth(overlayDepth + 3).setAlpha(0);
  const whiteFlash = scene.add.rectangle(width / 2, height / 2, width - 54, height - 50, 0xeafff4, 1).setDepth(overlayDepth + 3).setAlpha(0);
  const burst = () => {
    if (!scene.sys.isActive()) return;
    noise.clear();
    for (let i = 0; i < 90; i++) {
      const shade = Phaser.Math.RND.pick([0xffffff, 0xb8c8be, 0x111b18]);
      noise.fillStyle(shade, Phaser.Math.FloatBetween(.08, .34));
      noise.fillRect(Phaser.Math.Between(28, width - 30), Phaser.Math.Between(26, height - 30), Phaser.Math.Between(10, 190), Phaser.Math.Between(1, 5));
    }
    noise.setAlpha(Phaser.Math.FloatBetween(.48, .82));
    whiteFlash.setAlpha(Phaser.Math.FloatBetween(.025, .085));
    scene.cameras.main.shake(90, .0025);
    scene.time.delayedCall(Phaser.Math.Between(70, 150), () => {
      noise.setAlpha(0);
      whiteFlash.setAlpha(0);
    });
    scene.time.delayedCall(Phaser.Math.Between(1700, 4600), burst);
  };
  scene.time.delayedCall(Phaser.Math.Between(650, 1800), burst);
}

class ChapterFourBonus extends Phaser.Scene {
  private step = 0;
  private panel?: Phaser.GameObjects.Container;
  private advanceTimer?: Phaser.Time.TimerEvent;
  private music?: Phaser.Sound.BaseSound;

  constructor() { super("chapter4bonus"); }

  preload() {
    CHAPTER_FOUR_HEALING_MOMENTS.forEach(([, , imageKey]) => this.load.image(imageKey, `assets/${imageKey}.png`));
    this.load.audio("chapter4-bonus-music", "assets/chapter4-bonus-please-hold-me.mp3");
  }

  create() {
    this.step = 0;
    this.music = this.sound.add("chapter4-bonus-music", { volume: .6, loop: true });
    this.music.play();
    this.showMoment();
    addCrtTelevision(this);
    this.input.keyboard!.on("keydown-M", () => { this.sound.stopAll(); this.scene.start("menu"); });
    addAlwaysAvailableMenuButton(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sound.stopAll());
  }

  private showMoment() {
    this.panel?.destroy(true);
    this.advanceTimer?.remove(false);
    const { width, height } = this.scale;
    const [title, quote, imageKey] = CHAPTER_FOUR_HEALING_MOMENTS[this.step];
    const items: Phaser.GameObjects.GameObject[] = [];

    items.push(this.add.image(0, 0, imageKey).setOrigin(0).setDisplaySize(width, height));

    items.push(this.add.rectangle(width / 2, 64, width, 128, 0x05070b, .82));
    items.push(this.add.rectangle(width / 2, 580, 1060, 218, 0x07090d, .82).setStrokeStyle(2, 0xe2b870, .7));
    items.push(this.add.text(44, 34, "AFTER CHAPTER 4  •  THE HEALING MOMENT", { fontFamily: "Arial Black", fontSize: "17px", color: "#e8bf7d", stroke: "#000", strokeThickness: 4 }));
    items.push(this.add.text(44, 65, `${this.step + 1}. ${title}`, { fontFamily: "Arial Black", fontSize: "34px", color: "#fff3d4", stroke: "#000", strokeThickness: 7 }));
    const countdown = this.add.text(width - 44, 46, "10", { fontFamily: "Arial Black", fontSize: "43px", color: "#f2c57d", stroke: "#000", strokeThickness: 6 }).setOrigin(1, 0);
    items.push(countdown);
    items.push(this.add.text(width / 2, 530, quote, { fontFamily: "Georgia", fontStyle: "italic", fontSize: "28px", align: "center", color: "#fff7e7", stroke: "#000", strokeThickness: 5, wordWrap: { width: 900 } }).setOrigin(.5, 0));
    const isLast = this.step === CHAPTER_FOUR_HEALING_MOMENTS.length - 1;
    const button = this.add.rectangle(width / 2, 675, 250, 54, 0x8e5e27, 1).setStrokeStyle(3, 0xffd997, 1).setInteractive({ useHandCursor: true });
    items.push(button, this.add.text(width / 2, 675, isLast ? "CONTINUE" : "NEXT MOMENT", { fontFamily: "Arial Black", fontSize: "18px", color: "#fff6e2", stroke: "#2a1202", strokeThickness: 4 }).setOrigin(.5));
    button.on("pointerdown", () => this.advance());
    this.panel = this.add.container(0, 0, items);

    let seconds = 10;
    this.advanceTimer = this.time.addEvent({ delay: 1000, repeat: 9, callback: () => {
      seconds -= 1;
      countdown.setText(seconds.toString());
      if (seconds === 0) this.advance();
    }});
  }

  private advance() {
    this.advanceTimer?.remove(false);
    if (this.step >= CHAPTER_FOUR_HEALING_MOMENTS.length - 1) {
      this.sound.stopAll();
      localStorage.setItem(CHAPTER_FOUR_BONUS_DONE_KEY, "true");
      this.scene.start("chapter5");
      return;
    }
    this.step += 1;
    this.showMoment();
  }
}

class BonusHealing extends Phaser.Scene {
  private panel?: Phaser.GameObjects.Container;
  private step = 0;
  private gender: PlayerGender = "nonbinary";
  private music?: Phaser.Sound.BaseSound;
  private voice?: Phaser.Sound.BaseSound;
  private advanceTimer?: Phaser.Time.TimerEvent;
  private voiceTimer?: Phaser.Time.TimerEvent;
  private artTimer?: Phaser.Time.TimerEvent;

  constructor() { super("bonus"); }

  preload() {
    this.load.image("bonus-hug-boy", "assets/bonus-hug-boy.png");
    this.load.image("bonus-hug-girl", "assets/bonus-hug-girl.png");
    this.load.image("bonus-milk", "assets/bonus-milk.png");
    this.load.image("bonus-porch-boy", "assets/bonus-porch-boy.png");
    this.load.image("bonus-porch-girl", "assets/bonus-porch-girl.png");
    this.load.image("bonus-safe-boy", "assets/bonus-safe-boy.png");
    this.load.image("bonus-safe-girl", "assets/bonus-safe-girl.png");
    this.load.image("bonus-doorway-belt", "assets/bonus-doorway-belt.png");
    this.load.image("bonus-game-boy", "assets/bonus-game-boy.png");
    this.load.image("bonus-game-girl", "assets/bonus-game-girl.png");
    this.load.image("bonus-flashlight", "assets/bonus-flashlight.png");
    this.load.image("bonus-birthday", "assets/bonus-birthday.png");
    this.load.image("bonus-apology", "assets/bonus-apology.png");
    this.load.image("bonus-bike", "assets/bonus-bike.png");
    this.load.image("bonus-emotional-dad", "assets/bonus-emotional-dad.png");
    this.load.image("bonus-no-strings", "assets/bonus-no-strings.png");
    this.load.audio("bonus-music", "assets/bonus-past-lives.mp3");
    this.load.audio("bonus-love", "assets/bonus-voice-love.mp3");
    this.load.audio("bonus-milk-voice", "assets/bonus-voice-milk.mp3");
    this.load.audio("bonus-grass", "assets/bonus-voice-grass.mp3");
    this.load.audio("bonus-safe-voice", "assets/bonus-voice-safe.mp3");
    this.load.audio("bonus-game-voice", "assets/bonus-voice-game.mp3");
    this.load.audio("bonus-flashlight-voice", "assets/bonus-voice-flashlight.mp3");
    this.load.audio("bonus-birthday-voice", "assets/bonus-voice-birthday.mp3");
    this.load.audio("bonus-apology-voice", "assets/bonus-voice-apology.mp3");
    this.load.audio("bonus-bike-voice", "assets/bonus-voice-bike.mp3");
    this.load.audio("bonus-emotional-voice", "assets/bonus-voice-emotional.mp3");
    this.load.audio("bonus-no-strings-voice", "assets/bonus-voice-no-strings.mp3");
  }

  create() {
    this.step = 0;
    this.gender = savedGender() ?? "nonbinary";
    this.music = this.sound.add("bonus-music", { volume: .3, loop: true });
    this.music.play();
    this.showStep();
    addCrtTelevision(this);
    this.input.keyboard!.on("keydown-M", () => { this.sound.stopAll(); this.scene.start("menu"); });
    addAlwaysAvailableMenuButton(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.advanceTimer?.remove(false);
      this.voiceTimer?.remove(false);
      this.artTimer?.remove(false);
      this.sound.stopAll();
    });
  }

  private showStep() {
    this.advanceTimer?.remove(false);
    this.voiceTimer?.remove(false);
    this.artTimer?.remove(false);
    this.voice?.stop();
    this.voice?.destroy();
    this.panel?.destroy(true);
    const { width, height } = this.scale;
    const isGirl = this.gender === "female";
    const scenes = [
      { image: isGirl ? "bonus-hug-girl" : "bonus-hug-boy", audio: "bonus-love", title: "BONUS HEALING  •  HE STAYED", quote: "“You know... I love you. You're enough. I'm here.”" },
      { image: "bonus-milk", audio: "bonus-milk-voice", title: "BONUS HEALING  •  HE CAME BACK", quote: "“I brought back milk. Tomorrow, breakfast is on me! Cereal, everyone!”" },
      { image: isGirl ? "bonus-porch-girl" : "bonus-porch-boy", audio: "bonus-grass", title: "BONUS HEALING  •  HOME WAS ENOUGH", quote: "“Well... the grass wasn't greener on the other side.”" },
      { image: isGirl ? "bonus-safe-girl" : "bonus-safe-boy", introImage: "bonus-doorway-belt", voiceDelay: 3900, audio: "bonus-safe-voice", title: "BONUS HEALING  •  HE CHOSE DIFFERENTLY", quote: "“I won't hit you again. I was wrong. And I love you.”" },
      { image: isGirl ? "bonus-game-girl" : "bonus-game-boy", audio: "bonus-game-voice", title: "BONUS HEALING  •  HE SHOWED UP", quote: "“I came to your game! I love you! Good catch! Good swing!”" },
      { image: "bonus-flashlight", audio: "bonus-flashlight-voice", title: "BONUS HEALING  •  THE FLASHLIGHT", quote: "“Perfect. Thanks, buddy. I love you.”" },
      { image: "bonus-birthday", audio: "bonus-birthday-voice", title: "BONUS HEALING  •  THE BIRTHDAY CALL", quote: "“I called just to tell you happy birthday.”" },
      { image: "bonus-apology", audio: "bonus-apology-voice", title: "BONUS HEALING  •  HE TOOK RESPONSIBILITY", quote: "“I was wrong, and it wasn't your fault. Sometimes, I don't know how to handle my feelings. I hope you forgive me.”" },
      { image: "bonus-bike", audio: "bonus-bike-voice", title: "BONUS HEALING  •  LEARNING TO RIDE A BIKE", quote: "“I've got you. Keep going... you're doing it.”" },
      { image: "bonus-emotional-dad", audio: "bonus-emotional-voice", title: "BONUS HEALING  •  EMOTIONALLY AVAILABLE DAD", quote: "“You don't have to hide how you feel. I'm here. Tell me.”" },
      { image: "bonus-no-strings", audio: "bonus-no-strings-voice", title: "BONUS HEALING  •  NO STRINGS ATTACHED", quote: "“You don't owe me anything. I love you because you're you.”" },
    ];
    const scene = scenes[this.step];
    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x030303, 1);
    const bg = this.add.image(width / 2, height / 2, scene.image).setDisplaySize(width, height).setAlpha(0);
    const intro = scene.introImage ? this.add.image(width / 2, height / 2, scene.introImage).setDisplaySize(width, height).setAlpha(0) : undefined;
    const top = this.add.rectangle(width / 2, 66, width, 132, 0x090806, .72);
    const bottom = this.add.rectangle(width / 2, height - 101, width, 202, 0x090806, .74);
    const kicker = this.add.text(44, 38, scene.title, { fontFamily: "Arial Black", fontSize: "25px", color: "#fff0cb", stroke: "#000", strokeThickness: 6 });
    const count = this.add.text(width - 44, 38, `${this.step + 1} / ${scenes.length}`, { fontFamily: "Arial Black", fontSize: "17px", color: "#d8c49b" }).setOrigin(1, 0);
    const countdown = this.add.text(width - 44, 74, "NEXT MEMORY IN 10", { fontFamily: "Arial Black", fontSize: "18px", color: "#fff0cb", stroke: "#000", strokeThickness: 5 }).setOrigin(1, 0);
    const quote = this.add.text(width / 2, height - 150, scene.quote, { fontFamily: "Georgia", fontStyle: "italic", fontSize: "23px", color: "#fff4dc", stroke: "#000", strokeThickness: 5, align: "center", wordWrap: { width: 1100 } }).setOrigin(.5);
    const final = this.step === scenes.length - 1;
    const button = this.add.rectangle(width / 2, height - 55, final ? 370 : 240, 56, 0x6d2a24, 1).setStrokeStyle(3, 0xffdda0, 1).setInteractive({ useHandCursor: true });
    const buttonText = this.add.text(width / 2, height - 55, final ? "CONTINUE TO CHAPTER 3" : "NEXT MEMORY", { fontFamily: "Arial Black", fontSize: "18px", color: "#fff1d4", stroke: "#000", strokeThickness: 4 }).setOrigin(.5);
    if (final) {
      button.setVisible(false);
      buttonText.setVisible(false);
    }
    const panelObjects: Phaser.GameObjects.GameObject[] = [backdrop, bg];
    if (intro) panelObjects.push(intro);
    panelObjects.push(top, bottom, kicker, count, countdown, quote, button, buttonText);
    this.panel = this.add.container(0, 0, panelObjects);
    if (intro) {
      this.tweens.add({ targets: intro, alpha: 1, duration: 650, ease: "Sine.easeOut" });
      this.artTimer = this.time.delayedCall(3200, () => {
        this.tweens.add({ targets: intro, alpha: 0, duration: 900, ease: "Sine.easeInOut" });
        this.tweens.add({ targets: bg, alpha: 1, duration: 900, ease: "Sine.easeInOut" });
      });
    } else {
      this.tweens.add({ targets: bg, alpha: 1, duration: 850, ease: "Sine.easeOut" });
    }
    let remaining = 10;
    const next = () => {
      if (this.step >= scenes.length - 1) return;
      this.step += 1;
      this.showStep();
    };
    button.on("pointerdown", () => {
      if (final) {
        localStorage.setItem(BONUS_DONE_KEY, "true");
        this.scene.start("chapter3");
      } else {
        next();
      }
    });
    this.advanceTimer = this.time.addEvent({
      delay: 1000,
      repeat: 9,
      callback: () => {
        remaining -= 1;
        if (remaining > 0) {
          countdown.setText(final ? `CONTINUE UNLOCKS IN ${remaining}` : `NEXT MEMORY IN ${remaining}`);
        } else if (final) {
          countdown.setText("WHEN YOU'RE READY");
          button.setVisible(true);
          buttonText.setVisible(true);
        } else {
          next();
        }
      },
    });
    countdown.setText(final ? "CONTINUE UNLOCKS IN 10" : "NEXT MEMORY IN 10");
    const playVoice = () => {
      this.voice = this.sound.add(scene.audio, { volume: .95, rate: .88 });
      this.voice.play();
    };
    if (scene.voiceDelay) {
      this.voiceTimer = this.time.delayedCall(scene.voiceDelay, playVoice);
    } else {
      playVoice();
    }
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
    addAlwaysAvailableMenuButton(this);
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
      const gender = savedGender();
      const pronoun = gender === "female" ? "HER" : gender === "nonbinary" ? "THEM" : "HIM";
      const affirmation = this.add.text(width / 2, 143, `THE CHILD INSIDE ${pronoun} IS SAFE NOW`, {
        fontFamily: "Arial Black", fontSize: "16px", color: "#edcf88", stroke: "#1a0e08", strokeThickness: 4, letterSpacing: 2,
      }).setOrigin(.5, 0).setAlpha(0).setDepth(33);
      const continueButton = this.add.rectangle(width / 2, height - 83, 286, 62, 0x6d2a24, 1).setStrokeStyle(3, 0xffe0a0, 1).setAlpha(0).setDepth(34).setInteractive({ useHandCursor: true });
      const continueText = this.add.text(width / 2, height - 83, "CONTINUE", { fontFamily: "Arial Black", fontSize: "22px", color: "#fff2d4", stroke: "#000", strokeThickness: 4 }).setOrigin(.5).setAlpha(0).setDepth(35);
      continueButton.on("pointerdown", () => { this.sound.stopAll(); this.scene.start("chapter2"); });
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

class ChapterFiveRun extends Phaser.Scene {
  private mother!: Phaser.GameObjects.Image;
  private fawn!: Phaser.GameObjects.Image;
  private logs: Phaser.GameObjects.Image[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private jumpText!: Phaser.GameObjects.Text;
  private jumpButton!: Phaser.GameObjects.Container;
  private mainMusic!: Phaser.Sound.BaseSound;
  private winningMusic!: Phaser.Sound.BaseSound;
  private failureMusic!: Phaser.Sound.BaseSound;
  private elapsed = 0;
  private jumps = 0;
  private spawnClock = 0;
  private obstaclesSpawned = 0;
  private started = false;
  private ended = false;
  private jumping = false;

  constructor() { super("chapter5"); }

  preload() {
    this.load.image("chapter5-forest", "assets/chapter5-forest.png");
    this.load.image("chapter5-mother", "assets/chapter5-mother.png");
    this.load.image("chapter5-mother-jump", "assets/chapter5-mother-jump.png");
    this.load.image("chapter5-fawn", "assets/chapter5-fawn.png");
    this.load.image("chapter5-log", "assets/chapter5-log.png");
    this.load.image("chapter5-body", "assets/chapter5-body.png");
    this.load.image("chapter5-victory", "assets/chapter5-victory.png");
    this.load.image("chapter5-failure", "assets/chapter5-failure-v2.png");
    this.load.image("chapter5-blood-squirt", "assets/blood-squirt-right.png");
    this.load.audio("chapter5-main", "assets/chapter5-main.mp3");
    this.load.audio("chapter5-winning", "assets/chapter5-winning.mp3");
    this.load.audio("chapter5-failure-music", "assets/chapter5-failure-music.mp3");
    this.load.audio("chapter5-shotgun", "assets/chapter4-shotgunblast.mp3");
  }

  create() {
    const { width, height } = this.scale;
    this.elapsed = 0; this.jumps = 0; this.spawnClock = 0; this.obstaclesSpawned = 0; this.started = false; this.ended = false; this.jumping = false; this.logs = [];
    this.add.image(width / 2, height / 2, "chapter5-forest").setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x07101b, .12);
    this.mother = this.add.image(520, 500, "chapter5-mother").setDisplaySize(335, 223).setDepth(8);
    this.fawn = this.add.image(815, 500, "chapter5-fawn").setDisplaySize(220, 147).setDepth(8);
    for (let i = 0; i < 42; i++) {
      const snow = this.add.circle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), Phaser.Math.Between(1, 4), 0xe9f4ff, Phaser.Math.FloatBetween(.25, .75)).setDepth(9);
      this.tweens.add({ targets: snow, x: snow.x - Phaser.Math.Between(90, 250), y: height + 20, duration: Phaser.Math.Between(2200, 5200), delay: Phaser.Math.Between(0, 1800), repeat: -1 });
    }
    this.add.rectangle(width / 2, 65, width, 130, 0x03070d, .82).setDepth(20);
    this.add.text(28, 13, "CHAPTER 5", { fontFamily: "Arial Black", fontSize: "17px", color: "#c7dded", stroke: "#000", strokeThickness: 4 }).setDepth(21);
    this.add.text(28, 38, "RUN, MOTHER — RUN", { fontFamily: "Arial Black", fontSize: "34px", color: "#f2f7fb", stroke: "#07101a", strokeThickness: 7 }).setDepth(21);
    this.add.text(30, 88, "Twenty seconds. Ten logs. One missed jump changes everything.", { fontFamily: "Georgia", fontSize: "17px", color: "#c8d8e4" }).setDepth(21);
    this.timerText = this.add.text(width - 30, 17, "00:20", { fontFamily: "Arial Black", fontSize: "38px", color: "#ffffff", stroke: "#000", strokeThickness: 7 }).setOrigin(1, 0).setDepth(21);
    this.jumpText = this.add.text(width - 30, 72, "LOGS CLEARED  0 / 10", { fontFamily: "Arial Black", fontSize: "14px", color: "#d9edf8", stroke: "#000", strokeThickness: 4 }).setOrigin(1, 0).setDepth(21);
    this.jumpButton = this.makeJumpButton(width / 2, 650);
    this.mainMusic = this.sound.add("chapter5-main", { volume: .64 });
    this.winningMusic = this.sound.add("chapter5-winning", { volume: .64 });
    this.failureMusic = this.sound.add("chapter5-failure-music", { volume: .66 });
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", () => this.jump());
    this.input.keyboard!.on("keydown-M", () => this.scene.start("menu"));
    addAlwaysAvailableMenuButton(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sound.stopAll());
  }

  update(_time: number, delta: number) {
    if (!this.started || this.ended) return;
    const seconds = Math.min(delta / 1000, .05);
    this.elapsed += seconds;
    this.spawnClock -= seconds;
    if (this.spawnClock <= 0 && this.obstaclesSpawned < 10) {
      this.spawnLog();
      this.spawnClock = 1.7;
    }
    for (const log of [...this.logs]) {
      log.x -= 470 * seconds;
      if (log.getData("kind") !== "body") log.setAngle(Math.sin(this.elapsed * 9 + log.getData("phase")) * 3.5);
      if (!log.getData("passed") && log.x < this.mother.x - 155) {
        log.setData("passed", true);
        this.jumps += 1;
        this.jumpText.setText(`LOGS CLEARED  ${this.jumps} / 10`);
        this.cameras.main.flash(80, 190, 235, 255, false);
        if (this.jumps >= 10) { this.finish(true); return; }
      }
      if (!log.getData("passed") && Math.abs(log.x - this.mother.x) < 190 && this.mother.y > 455) {
        this.finish(false); return;
      }
      if (log.x < -260) { this.logs.splice(this.logs.indexOf(log), 1); log.destroy(); }
    }
    const remaining = Math.max(0, 20 - this.elapsed);
    this.timerText.setText(`00:${Math.ceil(remaining).toString().padStart(2, "0")}`);
    this.mother.setAngle(Math.sin(this.elapsed * 14) * 2.2);
    this.fawn.setY(500 + Math.sin(this.elapsed * 18 + .8) * 7).setAngle(Math.sin(this.elapsed * 15 + 1.4) * 2.5);
    if (remaining <= 0) this.finish(this.jumps >= 10);
  }

  private makeJumpButton(x: number, y: number) {
    const ring = this.add.circle(0, 0, 59, 0x08131d, .94).setStrokeStyle(5, 0xbde8ff, 1);
    const core = this.add.circle(0, 0, 45, 0x376c87, 1).setStrokeStyle(3, 0xe2f5ff, 1).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, -7, "JUMP!", { fontFamily: "Arial Black", fontSize: "19px", color: "#fff", stroke: "#071018", strokeThickness: 5 }).setOrigin(.5);
    const hint = this.add.text(0, 18, "CLICK / SPACE", { fontFamily: "Arial Black", fontSize: "8px", color: "#d8effb" }).setOrigin(.5);
    core.on("pointerdown", () => this.jump());
    this.tweens.add({ targets: ring, scale: 1.1, alpha: .58, duration: 480, yoyo: true, repeat: -1 });
    return this.add.container(x, y, [ring, core, label, hint]).setDepth(22);
  }

  private jump() {
    if (this.ended || this.jumping) return;
    if (!this.started) {
      this.started = true;
      this.mainMusic.play({ seek: 30 });
      this.spawnLog(true);
      this.spawnClock = 1.7;
    }
    this.jumping = true;
    this.mother.setTexture("chapter5-mother-jump").setDisplaySize(335, 223);
    this.tweens.add({ targets: this.mother, y: 285, duration: 500, ease: "Quad.Out", onComplete: () => {
      this.time.delayedCall(400, () => {
        this.tweens.add({ targets: this.mother, y: 500, duration: 600, ease: "Quad.In", onComplete: () => {
          this.mother.setTexture("chapter5-mother").setDisplaySize(335, 223).setY(500).setAngle(0);
          this.jumping = false;
        } });
      });
    } });
    this.tweens.add({ targets: this.jumpButton, scale: .86, duration: 60, yoyo: true });
  }

  private spawnLog(first = false) {
    const isBody = this.obstaclesSpawned === 4;
    const log = this.add.image(first ? 900 : 1420, isBody ? 505 : 530, isBody ? "chapter5-body" : "chapter5-log").setDepth(9).setData("passed", false).setData("phase", Phaser.Math.FloatBetween(0, Math.PI * 2)).setData("kind", isBody ? "body" : "log");
    if (isBody) {
      log.setDisplaySize(430, 215).setTint(0x8fa6ba).setAlpha(.78);
    } else {
      log.setDisplaySize(460, 130);
    }
    this.obstaclesSpawned += 1;
    this.logs.push(log);
  }

  private finish(won: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.mainMusic.stop();
    this.tweens.killTweensOf(this.mother);
    if (won) {
      this.mother.setTexture("chapter5-mother").setDisplaySize(335, 223).setY(500).setAngle(0);
      this.tweens.add({ targets: this.mother, x: 1450, y: 492, duration: 1650, ease: "Sine.In", onUpdate: () => this.mother.setAngle(Math.sin(this.time.now / 70) * 2.4) });
      this.tweens.add({ targets: this.fawn, x: 1640, y: 490, duration: 1650, ease: "Sine.In", onUpdate: () => this.fawn.setAngle(Math.sin(this.time.now / 62 + 1) * 3) });
      this.time.delayedCall(1050, () => this.cameras.main.fadeOut(600, 0, 0, 0));
      this.time.delayedCall(1700, () => { this.showEnding(true); this.cameras.main.fadeIn(700, 0, 0, 0); });
    } else {
      this.sound.play("chapter5-shotgun", { volume: .98 });
      this.cameras.main.flash(140, 255, 245, 225, false);
      this.cameras.main.shake(520, .026);
      const tracer = this.add.rectangle(1370, 350, 300, 6, 0xffefad, 1).setDepth(90).setAngle(-7);
      const tracerGlow = this.add.rectangle(1370, 350, 380, 18, 0xffd15c, .28).setDepth(89).setAngle(-7);
      this.tweens.add({ targets: [tracer, tracerGlow], x: -220, y: 505, duration: 210, ease: "Power3", onComplete: () => { tracer.destroy(); tracerGlow.destroy(); } });
      const blood = this.add.image(this.mother.x + 55, this.mother.y - 20, "chapter5-blood-squirt").setDisplaySize(260, 180).setDepth(94).setAngle(-12).setAlpha(.95);
      this.tweens.add({ targets: blood, x: blood.x - 85, y: blood.y - 35, scaleX: 1.45, scaleY: 1.45, alpha: 0, duration: 720, ease: "Power2", onComplete: () => blood.destroy() });
      const redFlash = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x8f0011, .34).setDepth(93).setAlpha(0);
      this.tweens.add({ targets: redFlash, alpha: .38, duration: 90, yoyo: true, hold: 120, onComplete: () => redFlash.destroy() });
      for (let i = 0; i < 24; i++) {
        const drop = this.add.circle(this.mother.x + 20, this.mother.y - 5, Phaser.Math.Between(3, 11), i % 4 === 0 ? 0x5b0009 : 0xb30018, Phaser.Math.FloatBetween(.65, 1)).setDepth(95);
        this.tweens.add({ targets: drop, x: drop.x + Phaser.Math.Between(-260, 220), y: drop.y + Phaser.Math.Between(-190, 150), scale: Phaser.Math.FloatBetween(.4, 1.7), alpha: 0, duration: Phaser.Math.Between(420, 900), ease: "Power2", onComplete: () => drop.destroy() });
      }
      for (let i = 0; i < 18; i++) {
        const impact = this.add.circle(560, 475, Phaser.Math.Between(2, 6), 0xf4fbff, Phaser.Math.FloatBetween(.45, 1)).setDepth(91);
        this.tweens.add({ targets: impact, x: impact.x + Phaser.Math.Between(-80, 100), y: impact.y + Phaser.Math.Between(-85, 45), alpha: 0, duration: Phaser.Math.Between(280, 600), onComplete: () => impact.destroy() });
      }
      this.tweens.add({ targets: this.mother, y: 555, angle: 76, alpha: .35, duration: 240 });
      const black = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 1).setDepth(100).setAlpha(0);
      this.time.delayedCall(520, () => black.setAlpha(1));
      this.time.delayedCall(2500, () => { black.destroy(); this.showEnding(false); });
    }
  }

  private showEnding(won: boolean) {
    const { width, height } = this.scale;
    if (won) this.winningMusic.play({ seek: 30, loop: true });
    else this.failureMusic.play({ loop: true });
    this.add.image(width / 2, height / 2, won ? "chapter5-victory" : "chapter5-failure").setDisplaySize(width, height).setDepth(40);
    if (!won) {
      this.add.image(650, 490, "chapter5-body").setDisplaySize(430, 215).setTint(0x7d91a8).setAlpha(.68).setAngle(-5).setDepth(41);
    }
    this.add.rectangle(width / 2, 72, width, 144, 0x020508, .72).setDepth(41);
    this.add.rectangle(width / 2, height - 91, width, 182, 0x020508, .72).setDepth(41);
    this.add.text(width / 2, 26, won ? "SHE MADE IT HOME" : "ONE LOG. ONE SHOT.", { fontFamily: "Arial Black", fontSize: "43px", color: won ? "#fff4c7" : "#d8e1e8", stroke: "#000", strokeThickness: 8 }).setOrigin(.5, 0).setDepth(42);
    this.add.text(width / 2, 82, won ? "Bambi gets to grow up with his mother." : "She fell in the snow. Try the run again.", { fontFamily: "Georgia", fontSize: "23px", color: "#edf3f7", stroke: "#000", strokeThickness: 5 }).setOrigin(.5).setDepth(42);
    const button = this.add.rectangle(width / 2, height - 80, 300, 64, 0x376c87, 1).setStrokeStyle(3, 0xd9f2ff, 1).setInteractive({ useHandCursor: true }).setDepth(42);
    this.add.text(width / 2, height - 80, won ? "CONTINUE" : "TRY AGAIN", { fontFamily: "Arial Black", fontSize: "21px", color: "#fff", stroke: "#071018", strokeThickness: 5 }).setOrigin(.5).setDepth(43);
    button.on("pointerdown", () => {
      if (!won) return this.scene.restart();
      localStorage.setItem(CHAPTER_FIVE_HEALED_KEY, "true");
      this.scene.start("chapter6");
    });
  }
}

class ChapterSixTrueEnding extends Phaser.Scene {
  private panel?: Phaser.GameObjects.Container;
  private weapon?: Phaser.GameObjects.Container;
  private music!: Phaser.Sound.BaseSound;

  constructor() { super("chapter6"); }

  preload() {
    this.load.image("chapter6-bedroom", "assets/chapter6-bedroom.png");
    this.load.audio("chapter6-last-scene", "assets/chapter6-last-scene.mp3");
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "chapter6-bedroom").setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x100817, .25);
    for (let i = 0; i < 34; i++) {
      const rain = this.add.rectangle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 2, Phaser.Math.Between(18, 50), 0xb7ccdf, Phaser.Math.FloatBetween(.08, .28)).setAngle(12);
      this.tweens.add({ targets: rain, x: rain.x + 170, y: height + 70, duration: Phaser.Math.Between(900, 1800), delay: Phaser.Math.Between(0, 1200), repeat: -1 });
    }
    this.music = this.sound.add("chapter6-last-scene", { volume: .58, loop: true });
    this.music.play({ seek: 20 });
    this.input.keyboard!.on("keydown-M", () => this.scene.start("menu"));
    addAlwaysAvailableMenuButton(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sound.stopAll());
    this.showOpening();
  }

  private clearPanel() { this.panel?.destroy(true); }

  private showOpening() {
    this.clearPanel();
    const { width, height } = this.scale;
    const items: Phaser.GameObjects.GameObject[] = [];
    items.push(this.add.rectangle(width / 2, 62, width, 124, 0x05030a, .84));
    items.push(this.add.text(28, 15, "CHAPTER 6  •  SECRET TRUE ENDING", { fontFamily: "Arial Black", fontSize: "16px", color: "#e4a8d7", stroke: "#000", strokeThickness: 4 }));
    items.push(this.add.text(28, 42, "FINAL BOSS: YOU WERE JUST A KID", { fontFamily: "Arial Black", fontSize: "34px", color: "#fff0fb", stroke: "#180513", strokeThickness: 7 }));
    items.push(this.add.rectangle(width / 2, height - 112, 900, 165, 0x08050c, .88).setStrokeStyle(2, 0xc979b5, .8));
    items.push(this.add.text(width / 2, height - 157, "Your childhood bedroom, 1994. Rain outside. The CRT whispers static.", { fontFamily: "Georgia", fontSize: "20px", color: "#d9c7d8" }).setOrigin(.5));
    items.push(this.add.text(width / 2, height - 116, "Your eight-year-old self looks up.", { fontFamily: "Georgia", fontStyle: "italic", fontSize: "22px", color: "#f4dbea" }).setOrigin(.5));
    items.push(this.add.text(width / 2, height - 79, "“Did we turn out okay?”", { fontFamily: "Georgia", fontStyle: "bold", fontSize: "28px", color: "#ffffff", stroke: "#000", strokeThickness: 4 }).setOrigin(.5));
    const button = this.add.rectangle(width / 2, height - 28, 280, 48, 0x78345f, 1).setStrokeStyle(2, 0xf2b5df, 1).setInteractive({ useHandCursor: true });
    items.push(button, this.add.text(width / 2, height - 28, "ENTER THE ROOM", { fontFamily: "Arial Black", fontSize: "16px", color: "#fff" }).setOrigin(.5));
    button.on("pointerdown", () => this.showBoss());
    this.panel = this.add.container(0, 0, items).setDepth(20);
  }

  private showBoss() {
    this.clearPanel();
    const { width, height } = this.scale;
    const items: Phaser.GameObjects.GameObject[] = [];
    items.push(this.add.rectangle(width / 2, 74, width, 148, 0x05030a, .9));
    items.push(this.add.text(28, 14, "FINAL BOSS", { fontFamily: "Arial Black", fontSize: "15px", color: "#d58abb" }));
    items.push(this.add.text(28, 39, "INNER CHILD", { fontFamily: "Arial Black", fontSize: "35px", color: "#fff" }));
    items.push(this.add.rectangle(470, 107, 830, 22, 0x1a0b18, 1).setOrigin(0, .5).setStrokeStyle(2, 0xe7a4d4, 1));
    items.push(this.add.rectangle(472, 107, 826, 16, 0xc9529c, 1).setOrigin(0, .5));
    items.push(this.add.text(width - 30, 40, "HP 100 / 100", { fontFamily: "Arial Black", fontSize: "22px", color: "#ffdff5" }).setOrigin(1, 0));
    const question = this.add.text(width / 2, 455, "“Why didn't anybody come save me?”", { fontFamily: "Georgia", fontStyle: "italic", fontSize: "31px", color: "#ffffff", stroke: "#10020c", strokeThickness: 6 }).setOrigin(.5);
    items.push(question);
    const responses = ["I tried my best.", "Because nobody knew how.", "I'm here now.", "Get over it, kid."];
    responses.forEach((label, i) => {
      const x = i % 2 === 0 ? 330 : 950;
      const y = i < 2 ? 535 : 607;
      const choice = this.add.rectangle(x, y, 540, 54, i === 3 ? 0x5b2028 : 0x382039, .98).setStrokeStyle(2, i === 3 ? 0xd76969 : 0xd39ac4, 1).setInteractive({ useHandCursor: true });
      const copy = this.add.text(x, y, label, { fontFamily: "Arial Black", fontSize: "17px", color: "#fff2fa" }).setOrigin(.5);
      choice.on("pointerdown", () => this.answer(i, question));
      items.push(choice, copy);
    });
    this.weapon = this.makeWeapon();
    items.push(this.weapon);
    this.panel = this.add.container(0, 0, items).setDepth(20);
  }

  private makeWeapon() {
    const g = this.add.graphics();
    g.fillStyle(0x17121b, 1).fillRoundedRect(-14, -170, 28, 260, 8);
    g.fillStyle(0xa9a2ae, 1).fillTriangle(0, -235, -18, -165, 18, -165);
    g.fillStyle(0x5e354f, 1).fillRoundedRect(-36, 72, 72, 26, 8);
    const label = this.add.text(0, 122, "THE WEAPON\nYOU BROUGHT IN", { fontFamily: "Arial Black", fontSize: "10px", align: "center", color: "#d7b4ce", stroke: "#000", strokeThickness: 3 }).setOrigin(.5);
    return this.add.container(1160, 540, [g, label]).setAngle(22);
  }

  private answer(index: number, question: Phaser.GameObjects.Text) {
    if (index === 0) {
      question.setText("“I know. You were trying to survive too.”");
    } else if (index === 1) {
      question.setText("“I still waited. I thought it was my fault.”");
    } else if (index === 3) {
      question.setText("HE DOESN'T ATTACK. HE JUST FLINCHES.").setColor("#ff9caa");
      this.cameras.main.shake(260, .012);
      this.tweens.add({ targets: this.weapon, scale: 1.18, duration: 100, yoyo: true });
    } else {
      this.offerPeace();
    }
  }

  private offerPeace() {
    this.clearPanel();
    const { width, height } = this.scale;
    const items: Phaser.GameObjects.GameObject[] = [];
    items.push(this.add.rectangle(width / 2, height - 128, 920, 190, 0x07040a, .9).setStrokeStyle(2, 0xe1a8d1, .8));
    items.push(this.add.text(width / 2, height - 178, "“Then stay.”", { fontFamily: "Georgia", fontStyle: "italic", fontSize: "35px", color: "#ffffff", stroke: "#000", strokeThickness: 5 }).setOrigin(.5));
    items.push(this.add.text(width / 2, height - 135, "The child has no attack animation. He never did.", { fontFamily: "Georgia", fontSize: "20px", color: "#d7c4d3" }).setOrigin(.5));
    const button = this.add.rectangle(width / 2, height - 74, 370, 62, 0x386159, 1).setStrokeStyle(3, 0xbfe9da, 1).setInteractive({ useHandCursor: true });
    items.push(button, this.add.text(width / 2, height - 74, "PUT IT DOWN • SIT BESIDE HIM", { fontFamily: "Arial Black", fontSize: "16px", color: "#effff9" }).setOrigin(.5));
    const keep = this.add.text(width / 2, height - 27, "Keep fighting", { fontFamily: "Arial Black", fontSize: "12px", color: "#8e7187" }).setOrigin(.5).setInteractive({ useHandCursor: true });
    items.push(keep);
    button.on("pointerdown", () => this.breakCycle());
    keep.on("pointerdown", () => this.showBoss());
    this.panel = this.add.container(0, 0, items).setDepth(25);
  }

  private breakCycle() {
    this.clearPanel();
    const { width, height } = this.scale;
    const lowered = this.makeWeapon().setDepth(28);
    this.tweens.add({ targets: lowered, y: 860, angle: 85, alpha: 0, duration: 900, ease: "Power2" });
    const fade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 1).setDepth(30).setAlpha(0);
    this.add.text(width / 2, height - 70, "You sit down beside the child.", { fontFamily: "Georgia", fontStyle: "italic", fontSize: "26px", color: "#ffffff", stroke: "#000", strokeThickness: 5 }).setOrigin(.5).setDepth(29);
    this.tweens.add({ targets: fade, alpha: 1, duration: 2400, delay: 700, onComplete: () => this.showAchievement() });
  }

  private showAchievement() {
    this.children.removeAll(true);
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x020203, 1);
    this.add.text(width / 2, 160, "ACHIEVEMENT UNLOCKED", { fontFamily: "Arial Black", fontSize: "21px", color: "#c692ef" }).setOrigin(.5);
    this.add.text(width / 2, 210, "BROKE THE CYCLE", { fontFamily: "Arial Black", fontSize: "58px", color: "#ffffff", stroke: "#48195b", strokeThickness: 9 }).setOrigin(.5);
    this.add.text(width / 2, 320, "“You couldn't save your childhood.\nBut you can stop fighting it.”", { fontFamily: "Georgia", fontStyle: "italic", fontSize: "30px", align: "center", color: "#e9dcea", lineSpacing: 12 }).setOrigin(.5);
    const button = this.add.rectangle(width / 2, 485, 280, 58, 0x5d2c66, 1).setStrokeStyle(2, 0xd9a9df, 1).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 485, "END CREDITS", { fontFamily: "Arial Black", fontSize: "17px", color: "#fff" }).setOrigin(.5);
    button.on("pointerdown", () => this.scene.start("chapter6credits"));
  }

  private showPostCredits() {
    this.children.removeAll(true);
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x070707, 1);
    this.add.text(width / 2, 125, "POST-CREDIT STATEMENT", { fontFamily: "Arial Black", fontSize: "20px", color: "#999" }).setOrigin(.5);
    this.add.text(width / 2, 218, "THERAPY BILL:  $18,450.00", { fontFamily: "Courier New", fontStyle: "bold", fontSize: "35px", color: "#f4f1e8" }).setOrigin(.5);
    this.add.text(width / 2, 280, "INSURANCE COVERED:  $47.12", { fontFamily: "Courier New", fontStyle: "bold", fontSize: "29px", color: "#e08a8a" }).setOrigin(.5);
    this.add.line(width / 2, 340, -380, 0, 380, 0, 0x666666, 1).setLineWidth(2);
    this.add.text(width / 2, 397, "NEW GAME+ UNLOCKED", { fontFamily: "Arial Black", fontSize: "25px", color: "#c29cdf" }).setOrigin(.5);
    this.add.text(width / 2, 444, "GENERATIONAL TRAUMA", { fontFamily: "Arial Black", fontSize: "45px", color: "#ffffff", stroke: "#562269", strokeThickness: 8 }).setOrigin(.5);
    const button = this.add.rectangle(width / 2, 575, 260, 58, 0x4f2859, 1).setStrokeStyle(2, 0xc89bd2, 1).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 575, "RETURN TO MENU", { fontFamily: "Arial Black", fontSize: "16px", color: "#fff" }).setOrigin(.5);
    button.on("pointerdown", () => this.scene.start("menu"));
  }
}

class ChapterSixEndCredits extends Phaser.Scene {
  private music!: Phaser.Sound.BaseSound;
  private teamsCall!: Phaser.Sound.BaseSound;
  private teamsEndingStarted = false;
  private debugBeat: number | null = null;
  private currentImage?: Phaser.GameObjects.Image;
  private currentShade?: Phaser.GameObjects.Rectangle;
  private currentTitle?: Phaser.GameObjects.Text;
  private currentCaption?: Phaser.GameObjects.Text;

  constructor() { super("chapter6credits"); }

  init(data: { debugBeat?: number }) {
    this.debugBeat = Number.isInteger(data?.debugBeat) ? Phaser.Math.Clamp(data.debugBeat!, 0, CHAPTER_SIX_CREDIT_BEATS.length - 1) : null;
    this.teamsEndingStarted = false;
  }

  preload() {
    const images = ["healing-room", "bike", "parent", "porch", "anxiety", "divorce", "bad-parent", "job", "teams"];
    images.forEach((name) => this.load.image(`chapter6-credits-${name}`, `assets/chapter6-credits-${name}.png`));
    ["fort", "ordinary-morning", "homeownership"].forEach((name) => this.load.image(`chapter6-credits-${name}`, `assets/chapter6-credits-${name}.jpg`));
    this.load.audio("chapter6-end-credits", "assets/chapter6-end-credits.mp3");
    this.load.audio("chapter6-teams-call", "assets/chapter6-teams-call.mp3");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);
    this.input.keyboard!.on("keydown-M", () => { this.sound.stopAll(); this.scene.start("menu"); });
    addAlwaysAvailableMenuButton(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.sound.stopAll());
    if (this.debugBeat !== null) {
      this.showDebugBeat(this.debugBeat);
      return;
    }
    this.music = this.sound.add("chapter6-end-credits", { volume: .74, loop: true });
    this.music.play();

    // Measured against the soundtrack: vocals and healing imagery alternate with each organ/bass entrance.
    const musicalSequence = [
      { at: 0, beat: 0 },       // vocal
      { at: 2360, beat: 4 },    // organ / bass
      { at: 4680, beat: 1 },    // vocal
      { at: 6260, beat: 5 },    // organ / bass
      { at: 8500, beat: 2 },    // vocal
      { at: 10360, beat: 6 },   // organ / bass
      { at: 12900, beat: 3 },   // vocal
      { at: 14340, beat: 7 },   // organ / bass
      { at: 16660, beat: 9 },   // vocal
      { at: 18320, beat: 11 },  // organ / bass
      { at: 20680, beat: 10 },  // vocal
      { at: 22360, beat: 8 },   // final organ / bass + Teams call
    ];
    musicalSequence.forEach(({ at, beat }) => this.time.delayedCall(at, () => this.showBeat(CHAPTER_SIX_CREDIT_BEATS[beat])));
  }

  private showDebugBeat(index: number) {
    if (CHAPTER_SIX_CREDIT_BEATS[index].key === "teams") {
      this.music = this.sound.add("chapter6-end-credits", { volume: .74, loop: true });
      this.music.play({ seek: 21.6 });
    }
    this.showBeat(CHAPTER_SIX_CREDIT_BEATS[index]);
    const { width } = this.scale;
    this.add.rectangle(width / 2, 38, width, 76, 0x020507, .88).setDepth(20);
    this.add.text(24, 38, `DEBUG SHOT ${index + 1} / ${CHAPTER_SIX_CREDIT_BEATS.length}`, { fontFamily: "Arial Black", fontSize: "14px", color: "#bceeff" }).setOrigin(0, .5).setDepth(21);
    const makeButton = (x: number, label: string, onClick: () => void) => {
      const button = this.add.rectangle(x, 38, 150, 42, 0x1b3d4d, .98).setStrokeStyle(2, 0x8bdfff, 1).setInteractive({ useHandCursor: true }).setDepth(21);
      this.add.text(x, 38, label, { fontFamily: "Arial Black", fontSize: "11px", color: "#f0fbff" }).setOrigin(.5).setDepth(22);
      button.on("pointerdown", onClick);
    };
    makeButton(width - 430, "◀ PREVIOUS", () => this.scene.restart({ debugBeat: (index + CHAPTER_SIX_CREDIT_BEATS.length - 1) % CHAPTER_SIX_CREDIT_BEATS.length }));
    makeButton(width - 265, "NEXT ▶", () => this.scene.restart({ debugBeat: (index + 1) % CHAPTER_SIX_CREDIT_BEATS.length }));
    makeButton(width - 100, "MAIN MENU", () => this.scene.start("menu"));
  }

  private beginTeamsEnding() {
    if (this.teamsEndingStarted) return;
    this.teamsEndingStarted = true;
    this.teamsCall = this.sound.add("chapter6-teams-call", { volume: 1 });
    this.teamsCall.play();
    this.time.delayedCall(7300, () => this.teamsCall.play());
    this.time.delayedCall(11900, () => {
      this.cameras.main.fadeOut(2100, 0, 0, 0);
      this.tweens.add({ targets: this.music, volume: 0, duration: 2100 });
      this.tweens.add({ targets: this.teamsCall, volume: 0, duration: 2100 });
    });
    this.time.delayedCall(14100, () => {
      this.sound.stopAll();
      this.showThankYou();
    });
  }

  private showThankYou() {
    localStorage.setItem(CHAPTER_SIX_COMPLETE_KEY, "true");
    this.cameras.main.resetFX();
    this.children.removeAll(true);
    const { width, height } = this.scale;
    const shareUrl = `${window.location.origin}/`;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 1);
    this.add.text(width / 2, 132, "THANK YOU FOR PLAYING", { fontFamily: "Arial Black", fontSize: "52px", color: "#ffffff", stroke: "#54142c", strokeThickness: 9 }).setOrigin(.5);
    this.add.text(width / 2, 218, "You couldn't save your childhood.\nBut you can stop fighting it.", { fontFamily: "Georgia", fontStyle: "italic", fontSize: "27px", align: "center", color: "#ddced5", lineSpacing: 10 }).setOrigin(.5);
    this.add.text(width / 2, 320, "SHARE THE HEALING WITH YOUR FRIENDS", { fontFamily: "Arial Black", fontSize: "17px", color: "#c88fa2" }).setOrigin(.5);
    this.add.rectangle(width / 2, 372, 620, 54, 0x0e0e10, 1).setStrokeStyle(2, 0x815363, 1);
    this.add.text(width / 2, 372, shareUrl, { fontFamily: "Courier New", fontStyle: "bold", fontSize: "20px", color: "#f4eaf0" }).setOrigin(.5);
    const status = this.add.text(width / 2, 438, "", { fontFamily: "Arial Black", fontSize: "13px", color: "#8fe0b0" }).setOrigin(.5);
    const copyButton = this.add.rectangle(width / 2 - 180, 493, 300, 60, 0x64243d, 1).setStrokeStyle(3, 0xe69ab5, 1).setInteractive({ useHandCursor: true });
    this.add.text(width / 2 - 180, 493, "COPY GAME LINK", { fontFamily: "Arial Black", fontSize: "16px", color: "#fff" }).setOrigin(.5);
    const shareButton = this.add.rectangle(width / 2 + 180, 493, 300, 60, 0x2f5362, 1).setStrokeStyle(3, 0x96d9eb, 1).setInteractive({ useHandCursor: true });
    this.add.text(width / 2 + 180, 493, "SHARE WITH FRIENDS", { fontFamily: "Arial Black", fontSize: "16px", color: "#fff" }).setOrigin(.5);
    const menuButton = this.add.rectangle(width / 2, 603, 280, 54, 0x252126, 1).setStrokeStyle(2, 0x8d7b83, 1).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 603, "RETURN TO MAIN MENU", { fontFamily: "Arial Black", fontSize: "14px", color: "#ded5d9" }).setOrigin(.5);

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        status.setText("LINK COPIED — SEND IT TO SOMEONE WHO NEEDS IT");
      } catch {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        status.setText("LINK COPIED");
      }
    };
    copyButton.on("pointerdown", copyLink);
    shareButton.on("pointerdown", async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: "Childhood Trauma Simulator", text: "Relive the moments that ruined a generation.", url: shareUrl });
          status.setText("THANKS FOR SHARING THE TRAUMA");
        } catch {
          status.setText("SHARE CANCELLED — THE LINK IS STILL HERE");
        }
      } else {
        await copyLink();
      }
    });
    menuButton.on("pointerdown", () => { resetGameState(); this.scene.start("menu"); });
    this.cameras.main.fadeIn(900, 0, 0, 0);
  }

  private showBeat(beat: { key: string; title: string; caption: string; horror: boolean }) {
    const { width, height } = this.scale;
    const next = this.add.image(width / 2, height / 2, `chapter6-credits-${beat.key}`).setDisplaySize(width, height).setAlpha(0).setDepth(1);
    const shade = this.add.rectangle(width / 2, height - 85, width, 170, 0x000000, beat.horror ? .82 : .62).setAlpha(0).setDepth(2);
    const title = this.add.text(42, height - 143, beat.title, {
      fontFamily: "Arial Black", fontSize: beat.horror ? "37px" : "33px", color: beat.horror ? "#ffdddd" : "#fff3cd", stroke: "#000000", strokeThickness: 8
    }).setAlpha(0).setDepth(3);
    const caption = this.add.text(45, height - 83, beat.caption, {
      fontFamily: beat.horror ? "Arial Black" : "Georgia", fontStyle: beat.horror ? "bold" : "italic", fontSize: beat.horror ? "24px" : "23px", color: beat.horror ? "#ff5d69" : "#ffffff", stroke: "#000000", strokeThickness: 6
    }).setAlpha(0).setDepth(3);

    if (beat.key === "teams") {
      const ring = this.add.circle(width - 110, 105, 54, 0xd72b55, .92).setStrokeStyle(5, 0xffb3c5, 1).setDepth(4).setAlpha(0);
      const phone = this.add.text(width - 110, 105, "☎", { fontFamily: "Arial Black", fontSize: "46px", color: "#ffffff" }).setOrigin(.5).setDepth(5).setAlpha(0);
      this.tweens.add({ targets: [ring, phone], alpha: 1, duration: 180, delay: 220, onComplete: () => this.tweens.add({ targets: ring, scale: 1.14, duration: 260, yoyo: true, repeat: -1 }) });
      this.beginTeamsEnding();
    }

    if (this.currentImage) this.hitMusicalTransition(beat.horror, beat.key === "teams");
    this.tweens.add({ targets: [next, shade, title, caption], alpha: 1, duration: beat.horror ? 90 : 260, ease: beat.horror ? "Power3" : "Sine.Out" });
    const oldImage = this.currentImage;
    const oldShade = this.currentShade;
    const oldTitle = this.currentTitle;
    const oldCaption = this.currentCaption;
    if (oldImage) this.tweens.add({ targets: [oldImage, oldShade, oldTitle, oldCaption], alpha: 0, duration: 360, onComplete: () => {
      oldImage.destroy(); oldShade?.destroy(); oldTitle?.destroy(); oldCaption?.destroy();
    } });
    this.currentImage = next;
    this.currentShade = shade;
    this.currentTitle = title;
    this.currentCaption = caption;
  }

  private hitMusicalTransition(horror: boolean, teams: boolean) {
    const { width, height } = this.scale;
    this.cameras.main.shake(teams ? 650 : horror ? 470 : 250, teams ? .032 : horror ? .022 : .009);
    const flash = this.add.rectangle(width / 2, height / 2, width, height, horror ? 0x9d001c : 0xfff1c6, horror ? .5 : .23).setDepth(12);
    this.tweens.add({ targets: flash, alpha: 0, duration: horror ? 280 : 420, ease: "Power2", onComplete: () => flash.destroy() });
    for (let i = 0; i < (horror ? 12 : 5); i++) {
      const bar = this.add.rectangle(
        Phaser.Math.Between(-100, width + 100),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(140, 580),
        Phaser.Math.Between(2, horror ? 17 : 8),
        horror ? Phaser.Math.RND.pick([0xff1648, 0x050505, 0xe8f7ff]) : 0xfff1c6,
        Phaser.Math.FloatBetween(.18, .72),
      ).setDepth(13);
      this.tweens.add({ targets: bar, x: bar.x + Phaser.Math.Between(-260, 260), alpha: 0, duration: Phaser.Math.Between(90, 260), onComplete: () => bar.destroy() });
    }
  }

  private showPostCredits() {
    this.sound.stopAll();
    this.children.removeAll(true);
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x070707, 1);
    this.add.text(width / 2, 85, "POST-CREDIT STATEMENT", { fontFamily: "Arial Black", fontSize: "20px", color: "#999" }).setOrigin(.5);
    this.add.text(width / 2, 174, "THERAPY BILL:  $18,450.00", { fontFamily: "Courier New", fontStyle: "bold", fontSize: "35px", color: "#f4f1e8" }).setOrigin(.5);
    this.add.text(width / 2, 236, "INSURANCE COVERED:  $47.12", { fontFamily: "Courier New", fontStyle: "bold", fontSize: "29px", color: "#e08a8a" }).setOrigin(.5);
    this.add.line(width / 2, 296, -380, 0, 380, 0, 0x666666, 1).setLineWidth(2);
    this.add.text(width / 2, 350, "NEW GAME+ UNLOCKED", { fontFamily: "Arial Black", fontSize: "25px", color: "#c29cdf" }).setOrigin(.5);
    this.add.text(width / 2, 397, "GENERATIONAL TRAUMA", { fontFamily: "Arial Black", fontSize: "45px", color: "#ffffff", stroke: "#562269", strokeThickness: 8 }).setOrigin(.5);
    this.add.text(width / 2, 468, "The real horror was the calendar invite we accepted along the way.", { fontFamily: "Georgia", fontStyle: "italic", fontSize: "20px", color: "#bdb3c2" }).setOrigin(.5);
    const button = this.add.rectangle(width / 2, 575, 260, 58, 0x4f2859, 1).setStrokeStyle(2, 0xc89bd2, 1).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 575, "RETURN TO MENU", { fontFamily: "Arial Black", fontSize: "16px", color: "#fff" }).setOrigin(.5);
    button.on("pointerdown", () => this.scene.start("menu"));
  }
}

class TraumaRadio extends Phaser.Scene {
  private bars: Phaser.GameObjects.Rectangle[] = [];
  private trackTitle!: Phaser.GameObjects.Text;
  private chapterTitle!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private playLabel!: Phaser.GameObjects.Text;
  private upcoming!: Phaser.GameObjects.Text;
  private radioChangeHandler = () => this.refreshRadioDisplay();

  constructor() { super("radio"); }

  create() {
    const { width, height } = this.scale;
    this.sound.stopAll();
    this.add.rectangle(width / 2, height / 2, width, height, 0x06070a, 1);
    if (this.textures.exists("swamp")) this.add.image(width / 2, height / 2, "swamp").setDisplaySize(width, height).setAlpha(.13).setTint(0x61222e);
    this.add.rectangle(width / 2, 66, width, 132, 0x070307, .94);
    this.add.text(32, 17, "CHILDHOOD TRAUMA SIMULATOR", { fontFamily: "Arial Black", fontSize: "14px", color: "#b58b91" });
    this.add.text(32, 39, "TRAUMA RADIO", { fontFamily: "Arial Black", fontSize: "43px", color: "#fff1e9", stroke: "#6e1027", strokeThickness: 8 });
    this.add.circle(width - 156, 48, 9, 0xff213e, 1);
    this.add.text(width - 134, 48, "ON AIR", { fontFamily: "Arial Black", fontSize: "20px", color: "#ff6076", stroke: "#250007", strokeThickness: 5 }).setOrigin(0, .5);

    this.add.rectangle(width / 2, 343, 1120, 430, 0x100e12, .96).setStrokeStyle(4, 0x7c4c54, 1);
    this.add.rectangle(width / 2, 242, 980, 154, 0x08090b, 1).setStrokeStyle(3, 0xd1966c, .65);
    this.add.text(width / 2, 190, "NOW PLAYING", { fontFamily: "Arial Black", fontSize: "13px", color: "#bc7f88" }).setOrigin(.5);
    this.trackTitle = this.add.text(width / 2, 230, "", { fontFamily: "Georgia", fontStyle: "bold", fontSize: "31px", color: "#fff1d6", align: "center", wordWrap: { width: 850 } }).setOrigin(.5);
    this.chapterTitle = this.add.text(width / 2, 274, "", { fontFamily: "Arial Black", fontSize: "13px", color: "#c9828c" }).setOrigin(.5);

    this.add.rectangle(width / 2, 370, 980, 3, 0x5e3239, 1);
    for (let i = 0; i < 38; i++) {
      const bar = this.add.rectangle(184 + i * 24.6, 370, 12, 20, i % 5 === 0 ? 0xffc06a : 0xe24560, .9).setOrigin(.5, 1);
      this.bars.push(bar);
    }

    const makeControl = (x: number, label: string, widthValue: number, action: () => void) => {
      const button = this.add.rectangle(x, 472, widthValue, 58, 0x4e1e2a, 1).setStrokeStyle(2, 0xef8798, 1).setInteractive({ useHandCursor: true });
      const text = this.add.text(x, 472, label, { fontFamily: "Arial Black", fontSize: "15px", color: "#fff0ed" }).setOrigin(.5);
      button.on("pointerover", () => button.setFillStyle(0x782d3e, 1));
      button.on("pointerout", () => button.setFillStyle(0x4e1e2a, 1));
      button.on("pointerdown", action);
      return text;
    };
    makeControl(width / 2 - 250, "◀ PREVIOUS", 210, () => playTraumaRadioTrack((traumaRadioIndex + TRAUMA_RADIO_TRACKS.length - 1) % TRAUMA_RADIO_TRACKS.length));
    this.playLabel = makeControl(width / 2, "PAUSE", 230, () => traumaRadioAudio?.paused ? resumeTraumaRadio() : pauseTraumaRadio());
    makeControl(width / 2 + 250, "NEXT ▶", 210, () => playTraumaRadioTrack((traumaRadioIndex + 1) % TRAUMA_RADIO_TRACKS.length));

    this.status = this.add.text(width / 2, 530, "", { fontFamily: "Courier New", fontStyle: "bold", fontSize: "13px", color: "#c2a2a7" }).setOrigin(.5);
    this.upcoming = this.add.text(width / 2, 577, "", { fontFamily: "Georgia", fontStyle: "italic", fontSize: "15px", color: "#917b80", align: "center", wordWrap: { width: 1040 } }).setOrigin(.5);
    this.add.text(width / 2, 624, "Screen-awake mode and lock-screen media controls are enabled while the station plays.", { fontFamily: "Arial Black", fontSize: "11px", color: "#9b737b" }).setOrigin(.5);

    const back = this.add.rectangle(width / 2, 674, 300, 52, 0x252126, 1).setStrokeStyle(2, 0x987982, 1).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 674, "STOP RADIO • MAIN MENU", { fontFamily: "Arial Black", fontSize: "14px", color: "#eadfe1" }).setOrigin(.5);
    back.on("pointerdown", () => { stopTraumaRadio(); this.scene.start("menu"); });
    this.input.keyboard!.on("keydown-M", () => { stopTraumaRadio(); this.scene.start("menu"); });

    window.addEventListener("trauma-radio-change", this.radioChangeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener("trauma-radio-change", this.radioChangeHandler));
    if (!traumaRadioAudio?.src) playTraumaRadioTrack(0); else resumeTraumaRadio();
    this.refreshRadioDisplay();
  }

  update(time: number) {
    const active = traumaRadioAudio && !traumaRadioAudio.paused;
    this.bars.forEach((bar, i) => {
      const wave = active ? .5 + .5 * Math.sin(time / 120 + i * .73 + Math.sin(time / 410 + i) * 2) : .08;
      bar.height = 12 + wave * (36 + (i % 7) * 7);
      bar.setAlpha(active ? .55 + wave * .45 : .22);
    });
  }

  private refreshRadioDisplay() {
    if (!this.trackTitle) return;
    const track = TRAUMA_RADIO_TRACKS[traumaRadioIndex];
    const playing = traumaRadioAudio && !traumaRadioAudio.paused;
    this.trackTitle.setText(track.title);
    const credit = "artist" in track && "album" in track
      ? `${track.chapter}  •  ${track.artist}  •  ${track.album}`
      : track.chapter;
    this.chapterTitle.setText(credit.toUpperCase());
    this.playLabel.setText(playing ? "PAUSE" : "PLAY");
    this.status.setText(`${playing ? "▶ STREAMING" : "Ⅱ PAUSED"}   •   TRACK ${traumaRadioIndex + 1} OF ${TRAUMA_RADIO_TRACKS.length}   •   BACKGROUND MUSIC ONLY`);
    const nextTracks = [1, 2, 3].map((offset) => TRAUMA_RADIO_TRACKS[(traumaRadioIndex + offset) % TRAUMA_RADIO_TRACKS.length].title);
    this.upcoming.setText(`UP NEXT:  ${nextTracks.join("   •   ")}`);
  }
}

new Phaser.Game({ type: Phaser.AUTO, parent: "game", width: 1280, height: 720, backgroundColor: "#07100f", scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [ChapterSelect, SwampRescue, ChapterTwoBattle, BonusHealing, ChapterThreeRescue, ChapterFourRescue, ChapterFourBonus, ChapterFiveRun, ChapterSixTrueEnding, ChapterSixEndCredits, TraumaRadio] });
