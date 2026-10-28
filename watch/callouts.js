const NS = 'http://www.w3.org/2000/svg';
const labels = {light: 'L / LIGHT', mode: 'C / MODE', adjust: 'A / ADJUST'};
const node = (name, attributes = {}) => {
  const element = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
};

export class ButtonCallouts {
  constructor(svg) {
    this.svg = svg;this.items = {};
    for (const action of Object.keys(labels)) {
      const group = node('g', {'data-button': action});
      const line = node('path', {class: 'button-leader'}), ring = node('circle', {class: 'button-ring'});
      const dot = node('circle', {class: 'button-dot', r: 4});
      const label = node('text', {class: 'button-label'});label.textContent = labels[action];
      const cursor = node('path', {class: 'button-pointer', d: 'M0 0 L0 25 L7 19 L13 30 L19 27 L13 16 L25 16 Z'});
      group.append(line, ring, dot, label, cursor);svg.append(group);
      this.items[action] = {group, line, ring, dot, label, cursor};
    }
  }
  update({width, height, points, button, time, presses, reduced = false}) {
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    for (const [action, item] of Object.entries(this.items)) {
      const active = button === 'all' || button === action;
      item.group.style.display = active ? '' : 'none';
      if (!active) continue;
      const point = points[action];if (!point) continue;
      const {x, y} = point, side = action === 'adjust' ? 1 : -1, mobile = width < 760;
      const span = mobile ? 34 : 105, labelX = x + side * span, labelY = y + (action === 'light' ? -22 : 25);
      const age = presses[action] === undefined ? Infinity : time - presses[action];
      const pressing = age >= 0 && age < .3;
      const pulse = reduced ? .5 : (Math.sin(time * Math.PI * 3) + 1) / 2;
      item.line.setAttribute('d', `M${x} ${y} L${labelX} ${y} L${labelX} ${labelY}`);
      item.ring.setAttribute('cx', x);item.ring.setAttribute('cy', y);item.ring.setAttribute('r', 12 + pulse * 7);
      item.ring.setAttribute('opacity', .55 + pulse * .45);
      item.dot.setAttribute('cx', x);item.dot.setAttribute('cy', y);item.dot.setAttribute('opacity', pressing ? 1 : .25);
      item.label.setAttribute('x', labelX);item.label.setAttribute('y', labelY + (action === 'light' ? -8 : 17));
      if(mobile)item.label.setAttribute('x', Math.min(width-16,Math.max(16,labelX)));
      item.label.setAttribute('text-anchor', mobile?(side>0?'end':'start'):(side>0?'start':'end'));
      item.cursor.setAttribute('transform', `translate(${x + 6 + (pressing ? 0 : pulse * 8)} ${y + 6 + (pressing ? 0 : pulse * 8)}) scale(${mobile ? .75 : 1})`);
      item.cursor.style.display = button === 'all' ? 'none' : '';
    }
  }
}
