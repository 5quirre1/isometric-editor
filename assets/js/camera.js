const camera = {
	x: 0,
	y: 0,
	scale: 1,
	init() {
		canvas.addEventListener('contextmenu', (e) => e.preventDefault());
		canvas.addEventListener('wheel', (e) => {
			if (e.ctrlKey) {
				const zoomFactor = 0.001;
				this.scale *= 1 - e.deltaY * zoomFactor;
				this.scale = Math.max(0.1, Math.min(this.scale, 10));
			} else {
				this.x -= e.deltaX;
				this.y -= e.deltaY;
			}
			e.preventDefault();
		}, {
			passive: false
		});
	},

	reset() {
		this.x = 0;
		this.y = 0;
		this.scale = 1;
	},

	screenToWorld(screenX, screenY) {
		return {
			x: (screenX - this.x) / this.scale,
			y: (screenY - this.y) / this.scale
		};
	},
    
	getOffset() {
		return {
			x: this.x,
			y: this.y,
			scale: this.scale
		};
	}
};
