class KLine {
  _ctx = null;
  _data = [];
  _renderNum = 10;

  // 一单位数据占几个像素
  _xAxisPxPerUnit = 0;
  _yAxisPxPerUnit = 0;
  
  // y 轴最大值
  _yAxisMax = 0;
  // y 轴原点值
  _yAxisOriginMin = 0;


  constructor(containerSel, data) {
    this._init(containerSel);
    this._data = data;

    this.render();
  }

  _init(containerSel) {
    const container = document.querySelector(containerSel);
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 500;
    canvas.style.border = "1px solid black";
    container.appendChild(canvas);

    this._ctx = canvas.getContext('2d');

    this._bindPopTrigger(canvas);
  }

  /**
   * 绑定弹窗触发事件，绘制虚线
   */
  _bindPopTrigger(canvas) {
    canvas.addEventListener("mousemove", (e) => {
      this._ctx.clearRect(0, 0, 900, 500)
      this.render();
      this._ctx.beginPath();
      this._ctx.setLineDash([3, 3]);
      this._ctx.strokeStyle = "gray";
      // 横
      this._ctx.moveTo(0, e.offsetY);
      this._ctx.lineTo(canvas.width, e.offsetY);
      // 竖
      // 计算实现吸附效果
      const x = this._xAxisPxPerUnit * (Math.ceil(e.offsetX / this._xAxisPxPerUnit) - 0.5);
      this._ctx.moveTo(x, 0);
      this._ctx.lineTo(x, canvas.height);
      // 绘制
      this._ctx.stroke();
    })
    canvas.addEventListener("mouseleave", (e) => {
      this._ctx.clearRect(0, 0, 900, 500)
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

  _drawAxis() {

  }

  _drawCandle(item, index) {
    const { open, close, high, low } = item.kline;
    this._ctx.strokeStyle = open > close ? 'rgb(10, 171, 98)' : 'rgb(255, 51, 51)';

    // 最高价、最低价
    if (high > Math.max(open, close)) {
      const highX = this._xAxisPxPerUnit * index + this._xAxisPxPerUnit / 2;
      const highY = this._yAxisPxPerUnit * (this._yAxisMax - high);
      const lowX = highX;
      const lowY = this._yAxisPxPerUnit * (this._yAxisMax - low);
      this._ctx.beginPath();
      this._ctx.setLineDash([]);
      this._ctx.moveTo(highX, highY);
      this._ctx.lineTo(lowX, lowY);
      this._ctx.stroke();
    }
    
    const x = this._xAxisPxPerUnit * index,
          y = this._yAxisPxPerUnit * (this._yAxisMax - (Math.max(open, close))),
          width = this._xAxisPxPerUnit,
          height = this._yAxisPxPerUnit * Math.abs(open - close);

    this._ctx.clearRect(x, y, width, height);
    // 开盘价、收盘价
    if (open > close) {
      this._ctx.fillStyle = 'rgb(10,171,98)';
      this._ctx.fillRect(x, y, width, height);
    } else {
      this._ctx.strokeStyle = 'rgb(255, 51, 51)';
      this._ctx.strokeRect(x, y, width, height);
    }
  }

  update(data) {
    this._data = data;
    this.render();
  }

  render() {
    this._calcPxPerUnit();
    for(let i = 0; i < this._data.length; i++) {
      this._drawCandle(this._data[i], i);
    }
  }
}