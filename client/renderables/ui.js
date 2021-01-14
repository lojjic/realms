import {
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
  Vector3,
} from '../core/three.js';
import {
  Text
} from '../core/troika-three-text.js'

// A general purpose UI class

class UI extends Mesh {
  static setupGeometry() {
    UI.geometry = new PlaneBufferGeometry(1, 1);
    UI.geometry.deleteAttribute('normal');
  }

  constructor({
    width = 0.4,
    height = 0.4,
    buttons = [],
    graphics = [],
    labels = [],
    styles = {},
    textureWidth = 256,
    textureHeight = 256,
  }) {
    if (!UI.geometry) {
      UI.setupGeometry();
    }
    styles = {
      background: '#222',
      color: '#fff',
      font: '700 18px monospace',
      textAlign: 'center',
      textBaseline: 'middle',
      ...styles,
      button: {
        background: '#333',
        border: '#000',
        color: '#fff',
        ...(styles.button || {}),
        active: {
          background: '#393',
          border: '#000',
          color: '#fff',
          ...(styles.button && styles.button.active ? styles.button.active : {}),
        },
        disabled: {
          background: '#222',
          border: '#000',
          color: '#777',
          ...(styles.button && styles.button.disabled ? styles.button.disabled : {}),
        },
      },
    };
    const renderer = document.createElement('canvas');
    renderer.width = textureWidth;
    renderer.height = textureHeight;
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    super(
      UI.geometry,
      new MeshBasicMaterial({
        map: texture,
      })
    );
    this.scale.set(width, height, 1);
    this.buttons = buttons;
    this.context = renderer.getContext('2d');
    this.graphics = graphics;
    this.labels = labels;
    this.pointer = new Vector3();
    this.renderer = renderer;
    this.styles = styles;
    this.texture = texture;
    this.add(this.textGroup = new Group())
    this.textGroup.position.set(-0.5, 0.5, 0)
    this.textGroup.scale.set(1 / textureWidth, 1 / textureHeight, 0)
    this.draw();
  }

  dispose() {
    const { material, texture } = this;
    material.dispose();
    texture.dispose();
  }

  draw() {
    const {
      buttons,
      context: ctx,
      graphics,
      labels,
      renderer,
      styles,
      texture,
    } = this;
    const textConfigs = []
    ctx.clearRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = styles.background;
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    graphics.forEach((draw) => {
      ctx.save();
      draw({ ctx, styles });
      ctx.restore();
    });
    buttons.forEach(({
      label,
      x,
      y,
      width,
      height,
      background,
      border,
      color,
      font,
      textAlign,
      textBaseline,
      textOffset,
      isActive,
      isDisabled,
      isVisible,
    }) => {
      if (isVisible === false) {
        return;
      }
      let { button } = styles;
      if (isActive) {
        button = styles.button.active;
      } else if (isDisabled) {
        button = styles.button.disabled;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.fillStyle = background || button.background;
      ctx.strokeStyle = border || button.border;
      ctx.fill();
      ctx.stroke();
      if (label) {
        textConfigs.push(Object.assign(
          parseFontStyle(font || button.font || styles.font),
          {
            text: label,
            color: color || button.color,
            anchorX: textAlign || button.textAlign || styles.textAlign,
            anchorY: textBaseline || button.textBaseline || styles.textBaseline,
            x: (x + width * 0.5),
            y: -(y + height * 0.5 + (textOffset || 0))
          }
        ))
      }
      ctx.restore();
    });
    labels.forEach(({
      x,
      y,
      color,
      font,
      text,
      textAlign,
      textBaseline,
      isVisible,
    }) => {
      if (isVisible === false || !text) {
        return;
      }
      textConfigs.push(Object.assign(
        parseFontStyle(font || styles.font),
        {
          text,
          color: color || styles.color,
          anchorX: textAlign || styles.textAlign,
          anchorY: textBaseline || styles.textBaseline,
          x: x,
          y: -y
        }
      ))
    });
    texture.needsUpdate = true;

    // Reconcile text labels to Text children:
    const textChildren = this.textGroup.children
    while (textChildren.length > textConfigs.length) {
      const child = textChildren.pop()
      child.dispose()
    }
    while (textChildren.length < textConfigs.length) {
      const textObj = new Text()
      textObj.depthOffset = -1
      this.textGroup.add(textObj)
    }
    textConfigs.forEach((cfg, i) => {
      let child = textChildren[i]
      child.position.set(cfg.x, cfg.y, 0)
      delete cfg.x
      delete cfg.y
      Object.assign(child, cfg)
      child.sync()
    })
  }

  onPointer(point) {
    const { buttons, pointer, renderer } = this;
    this.worldToLocal(pointer.copy(point));
    pointer.set(
      (pointer.x + 0.5) * renderer.width,
      (1 - (pointer.y + 0.5)) * renderer.height,
      0
    );
    const l = buttons.length - 1;
    for (let i = l; i >= 0; i -= 1) {
      const {
        isDisabled,
        x,
        y,
        width,
        height,
        onPointer,
      } = buttons[i];
      if (
        !isDisabled
        && onPointer
        && pointer.x >= x
        && pointer.x <= x + width
        && pointer.y >= y
        && pointer.y <= y + height
      ) {
        onPointer();
        break;
      }
    }
  }
}

function parseFontStyle(str) {
  // This is pretty fragile
  let [, weight, size, family] = str.match(/^(\d+)\s+(\d+)px\s+(\w+)$/)
  if (family === 'monospace') {
    family = 'https://fonts.gstatic.com/s/firamono/v9/N0bX2SlFPv1weGeLZDtQIg.woff' //Fira Mono
  }
  return {
    fontSize: +size,
    font: family
  }
}

export default UI;
