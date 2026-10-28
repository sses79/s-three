import {WatchState} from './state.js';

const fields = ['seconds', 'hours', 'minutes', 'month', 'date', 'day'];
const bounded = (value, max, fallback) => Number.isInteger(value) && value >= 0 && value < max ? value : fallback;

// SECOND's instructional controls follow Casio module 593's three-button layout.
// Keep the original WatchState available for the first, historical product film.
export class ManualWatchState extends WatchState {
  constructor(options = {}) {
    super(options);
    this.controls = 'manual';this.utc = !!options.utc;
    this.alarmHour = bounded(options.alarmHour, 24, 7);
    this.alarmMinute = bounded(options.alarmMinute, 60, 0);
    this.alarmEnabled = options.alarmEnabled === true;
    this.chimeEnabled = options.chimeEnabled === true;
    this.alarmField = null;this.field = 'seconds';this.split = null;
    this.lightUntil = -Infinity;this.ringUntil = -Infinity;this.lastAlarm = null;this.lastChime = null;
  }
  // The parent constructor writes lit; the manual profile uses a timed lamp instead.
  get lit() {return this.tick() < this.lightUntil;}
  set lit(value) {this.lightUntil = value ? Infinity : -Infinity;}
  get ringing() {return this.tick() < this.ringUntil;}
  read(date, field) {
    const names = {seconds: 'Seconds', hours: 'Hours', minutes: 'Minutes', month: 'Month', date: 'Date', day: 'Day'};
    return date['get' + (this.utc ? 'UTC' : '') + names[field]]();
  }
  write(date, field, value) {
    const names = {seconds: 'Seconds', hours: 'Hours', minutes: 'Minutes', month: 'Month', date: 'Date'};
    date['set' + (this.utc ? 'UTC' : '') + names[field]](value);
  }
  date() {return new Date(this.edit !== null ? this.edit : this.now() + this.offset);}
  modeButton() {
    if (this.edit !== null) {this.save();return;}
    if (this.alarmField !== null) {this.alarmField = null;this.mode = 'clock';return;}
    const modes = ['clock', 'alarm', 'stopwatch', 'setting'];
    this.mode = modes[(modes.indexOf(this.mode) + 1) % modes.length];
    if (this.mode === 'setting') {this.edit = this.now() + this.offset;this.field = 'seconds';}
  }
  light() {
    if (this.ringing) {this.dismissAlarm();return;}
    if (this.mode === 'setting') {this.field = fields[(fields.indexOf(this.field) + 1) % fields.length];return;}
    if (this.mode === 'alarm') {
      this.alarmField = this.alarmField === null ? 'hours' : this.alarmField === 'hours' ? 'minutes' : null;
      this.alarmEnabled = true;return;
    }
    if (this.mode === 'stopwatch') {
      if (this.started === null) this.resetStopwatch();
      else this.split = this.split === null ? this.stopwatch() : null;
      return;
    }
    // A tap gives a short readable preview of the lamp in this browser adaptation.
    this.lightUntil = this.tick() + 1200;
  }
  adjust() {
    if (this.mode === 'stopwatch') {super.adjust();return;}
    if (this.mode === 'alarm') {
      if (this.alarmField === 'hours') this.alarmHour = (this.alarmHour + 1) % 24;
      else if (this.alarmField === 'minutes') this.alarmMinute = (this.alarmMinute + 1) % 60;
      else {
        const current = (this.alarmEnabled ? 1 : 0) + (this.chimeEnabled ? 2 : 0), next = (current + 1) % 4;
        this.alarmEnabled = !!(next & 1);this.chimeEnabled = !!(next & 2);
      }
      return;
    }
    if (this.mode === 'setting') {
      const date = this.date(), value = this.read(date, this.field);
      if (this.field === 'seconds') this.write(date, 'seconds', 0);
      if (this.field === 'hours') this.write(date, 'hours', (value + 1) % 24);
      if (this.field === 'minutes') this.write(date, 'minutes', (value + 1) % 60);
      if (this.field === 'month') this.write(date, 'month', (value + 1) % 12);
      if (this.field === 'date') this.write(date, 'date', value + 1);
      if (this.field === 'day') this.write(date, 'date', this.read(date, 'date') + 1);
      this.edit = date.getTime();return;
    }
    this.format24 = !this.format24;
  }
  save() {
    if (this.edit !== null) {this.offset = this.edit - this.now();this.edit = null;}
    this.alarmField = null;this.mode = 'clock';
  }
  sync() {super.sync();this.alarmField = null;}
  resetStopwatch() {super.resetStopwatch();this.split = null;}
  displayStopwatch() {return this.split === null ? this.stopwatch() : this.split;}
  dismissAlarm() {this.ringUntil = -Infinity;}
  pollAlarm() {
    if (this.edit !== null) return null;
    const date = this.date(), hour = this.read(date, 'hours'), minute = this.read(date, 'minutes');
    const key = [date.getFullYear(), date.getMonth(), date.getDate(), hour, minute].join('-');
    if (this.alarmEnabled && hour === this.alarmHour && minute === this.alarmMinute && this.read(date,'seconds') === 0 && this.lastAlarm !== key) {
      this.lastAlarm = key;this.ringUntil = this.tick() + 20000;return 'alarm';
    }
    if (this.chimeEnabled && minute === 0 && this.read(date, 'seconds') === 0 && this.lastChime !== key) {
      this.lastChime = key;this.ringUntil = this.tick() + 1000;return 'chime';
    }
    return null;
  }
  snapshot() {return {...super.snapshot(), alarmHour: this.alarmHour, alarmMinute: this.alarmMinute,
    alarmEnabled: this.alarmEnabled, chimeEnabled: this.chimeEnabled};}
}
