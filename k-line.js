const COLOR_UP = 'rgb(255, 51, 51)';
const COLOR_DOWN = 'rgb(10, 171, 98)';
const FONT_12PX = '12px "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif';
const FONT_14PX = '14px "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif';

class KLine {
  _ctx = null;
  _data = [];

  // 一单位数据占几个像素
  _xAxisPxPerUnit = 0;
  _yAxisPxPerUnit = 0;
  
  // y 轴最大值
  _yAxisMax = 0;
  // y 轴原点值
  _yAxisOriginMin = 0;

  _pop = null;
  _hoverIndex = -1;


  constructor(containerSel, data) {
    this._init(containerSel);
    this._data = data;

    this.render();
  }

  _init(containerSel) {
    const container = document.querySelector(containerSel);
    container.style.position = 'relative';
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    this._ctx = canvas.getContext('2d');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    // canvas.style.width = container.clientWidth + 'px';
    // canvas.style.height = container.clientHeight + 'px';
    // canvas.width = container.clientWidth * 2;
    // canvas.height = container.clientHeight * 2;
    // this._ctx.scale(2, 2);

    this._createPop(container);
    this._bindPopTrigger(canvas);
    this._bindWindowResize(container, canvas);
  }

  _bindWindowResize(container, canvas) {
    window.onresize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      this.render();
    }
  }

  _createPop(container) {
    this._pop = document.createElement("div");
    this._pop.style.cssText = `
      display: none;
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(235, 245, 255, .9);
      width: 150px;
      padding: 10px;
      border-radius: 5px;
      pointer-events: none;
    `
    container.appendChild(this._pop);
  }

  /**
   * 绑定弹窗触发事件，绘制虚线
   */
  _bindPopTrigger(container) {
    const { canvas } = this._ctx;
    container.addEventListener("mousemove", (e) => {
      this._drawDashLine(e.offsetX, e.offsetY);
      this._popUp(e.offsetX);
    });
    container.addEventListener("mouseleave", (e) => {
      this._hoverIndex = -1;
      this._pop.style.display = 'none';
      this._ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      this.render();
    })
  }

  /**
   * 计算x、y轴单位像素大小
   */
  _calcPxPerUnit() {
    // 计算 x 轴单位宽度
    this._xAxisPxPerUnit = this._ctx.canvas.clientWidth / this._data.length;

    // 找出数据中的最大值和最小值
    let max = -Infinity, min = Infinity;
    for (let i = 0; i < this._data.length; i++) {
      const { open, high, low, close } = this._data[i].kline;
      const dayMax = Math.max(open, high, low, close);
      max = max > dayMax ? max : dayMax;
      const dayMin = Math.min(open, high, low, close);
      min = min < dayMin ? min : dayMin;
    }
    // 高度自适应：
    // 整个高度占 12 份，蜡烛图区域高度占 10 份，上下留白各占 1 份
    const totalCandleHeight = this._ctx.canvas.clientHeight * 10 / 12;

    // 计算 y 轴单位高度
    this._yAxisPxPerUnit = totalCandleHeight / (max - min);

    // 计算 y 轴原点的 offset
    this._yAxisOriginMin = min - (max - min) / 10;

    this._yAxisMax = max + (max - min) / 10
  }

  _drawDashLine(offsetX, offsetY) {
    const { canvas } = this._ctx;
    this._ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
    this.render();
    this._ctx.beginPath();
    this._ctx.setLineDash([3, 3]);
    this._ctx.strokeStyle = "gray";
    // 横
    this._ctx.moveTo(0, offsetY);
    this._ctx.lineTo(canvas.width, offsetY);

    // 竖
    // 计算实现吸附效果
    const x = this._xAxisPxPerUnit * (Math.ceil(offsetX / this._xAxisPxPerUnit) - 0.5);
    this._ctx.moveTo(x, 0);
    this._ctx.lineTo(x, canvas.height);
    this._ctx.stroke();

    const [ xValue, yValue ] = this._pxToValue(offsetX, offsetY);
    // 纵轴值
    this._ctx.fillStyle = 'rgb(245, 245, 245)';
    this._ctx.clearRect(0, offsetY - 8, 40, 16);
    this._ctx.fillRect(0, offsetY - 8, 40, 16);
    this._ctx.fillStyle = 'rgb(66, 66, 66)';
    this._ctx.font = FONT_12PX;
    this._ctx.fillText(yValue.toFixed(2), 5, offsetY + 4);

    // 横轴值
    this._ctx.fillStyle = 'rgb(245, 245, 245)';
    this._ctx.clearRect(x - 30, canvas.clientHeight - 16, 60, 16);
    this._ctx.fillRect(x - 30, canvas.clientHeight - 16, 60, 16);
    this._ctx.fillStyle = 'rgb(66, 66, 66)';
    this._ctx.font = FONT_12PX;
    this._ctx.fillText(xValue, x - 28, canvas.clientHeight - 2);
  }

  _popUp(offsetX) {
    const index = Math.floor(offsetX / this._xAxisPxPerUnit);
    if (this._hoverIndex === index) {
      return;
    }
    this._hoverIndex = index;
    const item = this._data[index];
    const { open, close, high, low } = item.kline;
    const { canvas } = this._ctx;
    let [ x ] = this._valueToPx(item.date);
    const popDom = this._pop.getBoundingClientRect();
    if (x > (canvas.clientWidth / 2)) {
      x = x - popDom.width - 10;
    } else {
      x = x + 10;
    }

    this._pop.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>时间</span>
        <span>${item.date}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px">
        <span>开盘价</span>
        <span style="color: ${open > close ? COLOR_DOWN : COLOR_UP}">${open.toFixed(3)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px">
        <span>收盘价</span>
        <span style="color: ${open > close ? COLOR_DOWN : COLOR_UP}">${close.toFixed(3)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px">
        <span>最高价</span>
        <span>${high.toFixed(3)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px">
        <span>最低价</span>
        <span>${low.toFixed(3)}</span>
      </div>
    `;

    this._pop.style.left = x + 'px';
    this._pop.style.display = 'block';
  }

  /**
   * 画坐标轴
   */
  _drawAxis() {
    const { canvas } = this._ctx;
    // 外边框
    this._ctx.setLineDash([]);
    this._ctx.strokeStyle = 'rgba(200, 200, 255, .3)';
    this._ctx.strokeRect(1, 1, canvas.clientWidth - 2, canvas.clientHeight - 2);

    // 竖轴
    // 从左边第二个开始，每隔150px以上画一次x轴值，例如：每个数据占60px，150 / 60 = 2.xxx ， 所以每 2+1 个数据画一个值
    const xStep = Math.ceil(150 / this._xAxisPxPerUnit);
    for (let i = 1; i < this._data.length; i += xStep) {
      const [xPx] = this._valueToPx(this._data[i].date);
      this._ctx.beginPath();
      this._ctx.moveTo(xPx, 0);
      this._ctx.lineTo(xPx, canvas.clientHeight);
      this._ctx.stroke();
      this._ctx.closePath();
    }

    // 横轴
    // 间隔最大值 150px平均分割，从最小值开始
    const yStep = canvas.clientHeight / 3;
    for (let iPx = 0; iPx <= canvas.clientHeight; iPx += yStep) {
      this._ctx.beginPath();
      this._ctx.moveTo(0, iPx);
      this._ctx.lineTo(canvas.clientWidth, iPx);
      this._ctx.stroke();
      this._ctx.closePath();
    }
  }

  /**
   * 画轴值
   */
  _drawAxisStepValue() {
    const { canvas } = this._ctx;
    // 外边框
    this._ctx.setLineDash([]);
    // 轴值字体
    this._ctx.fillStyle = 'black';
    this._ctx.font = FONT_14PX;

    // 竖轴
    // 从左边第二个开始，每隔150px以上画一次x轴值，例如：每个数据占60px，150 / 60 = 2.xxx ， 所以每 2+1 个数据画一个值
    const xStep = Math.ceil(150 / this._xAxisPxPerUnit);
    for (let i = 1; i < this._data.length; i += xStep) {
      const [xPx] = this._valueToPx(this._data[i].date);
      this._ctx.fillText(this._data[i].date, xPx - 32, canvas.clientHeight - 7)
    }

    // 横轴
    // 间隔最大值 150px平均分割，从最小值开始
    const yStep = canvas.clientHeight / 3;
    for (let iPx = 0; iPx <= canvas.clientHeight; iPx += yStep) {
      const [_, yValue] = this._pxToValue(null, iPx);
      let y = iPx + 7;
      if (iPx === 0) {
        y = iPx + 24;
      } else if (iPx === canvas.clientHeight) {
        y = iPx - 17;
      }
      this._ctx.fillText(yValue.toFixed(1), 10, y);
    }
  }

  _drawCandle(item) {
    const { open, close, high, low } = item.kline;
    this._ctx.strokeStyle = open > close ? COLOR_DOWN : COLOR_UP;

    // 最高价、最低价
    if (high > Math.max(open, close)) {
      const [ highX, highY ] = this._valueToPx(item.date, high);
      const [ lowX, lowY ] = this._valueToPx(item.date, low);
      this._ctx.beginPath();
      this._ctx.setLineDash([]);
      this._ctx.moveTo(highX, highY);
      this._ctx.lineTo(lowX, lowY);
      this._ctx.stroke();
    }
    
    const [ x, y ] = this._valueToPx(item.date, Math.max(open, close));
    const width = this._xAxisPxPerUnit,
          height = this._yAxisPxPerUnit * Math.abs(open - close);

    const gap = 6;
    const drawX = x - ((width - gap) / 2);
    this._ctx.clearRect(drawX, y, width - gap, height);
    // 开盘价、收盘价
    if (open > close) {
      this._ctx.fillStyle = COLOR_DOWN;
      this._ctx.fillRect(drawX, y, width - gap, height);
    } else {
      this._ctx.strokeStyle = COLOR_UP;
      this._ctx.strokeRect(drawX, y, width - gap, height);
    }
  }

  _valueToPx(x = 0, y = 0) {
    const xIndex = this._data.findIndex((item) => item.date === x);
    const xPx = (xIndex + 0.5) * this._xAxisPxPerUnit;
    const yPx = this._yAxisPxPerUnit * (this._yAxisMax - y);
    return [xPx, yPx];
  }

  _pxToValue(xPx = 0, yPx = 0) {
    const { canvas } = this._ctx;
    const index = Math.floor(xPx / this._xAxisPxPerUnit);
    const xValue = this._data[index].date
    const yValue = (canvas.clientHeight - yPx) / canvas.clientHeight * (this._yAxisMax - this._yAxisOriginMin) + this._yAxisOriginMin;
    return [xValue, yValue];
  }

  update(data) {
    const { canvas } = this._ctx;
    this._data = data;
    this._ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    this.render();
  }

  render() {
    this._calcPxPerUnit();
    this._drawAxis();
    for(let i = 0; i < this._data.length; i++) {
      this._drawCandle(this._data[i]);
    }
    this._drawAxisStepValue();
  }
}