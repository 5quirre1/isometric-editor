class IsometricObject {
    constructor(gridX, gridY, src, offset = { x: 0, y: 0 }) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.gridX = gridX;
        this.gridY = gridY;
        this.offset = offset;
        this.src = src;
        this.spriteLayer = 0;
        this.image = new Image();
        this.image.src = src;
        this.loaded = false;
        this.image.onload = () => {
            this.loaded = true;
        };
    }

    draw(ctx, screenCenterX, screenCenterY, tileHeight, gridToIso) {
        if (!this.loaded) return;
        const pos = gridToIso(this.gridX, this.gridY);
        const drawX = pos.x + screenCenterX - this.image.width / 2 + this.offset.x;
        const drawY = pos.y + screenCenterY - this.image.height + tileHeight + this.offset.y;
        ctx.drawImage(this.image, drawX, drawY);
    }
}

class ObjectManager {
    constructor() {
        this.objects = [];
        this.skybox = null;
        this.skyboxLoaded = false;
    }

    addObject(gridX, gridY, src, offset = { x: 0, y: 0 }) {
        const obj = new IsometricObject(gridX, gridY, src, offset);
        this.objects.push(obj);
        return obj;
    }

    setSkybox(src) {
        this.skybox = new Image();
        this.skybox.src = src;
        this.skyboxLoaded = false;
        this.skybox.onload = () => (this.skyboxLoaded = true);
    }

    drawSkybox(ctx, screenWidth, screenHeight) {
        if (!this.skyboxLoaded) return;
        const scale = 2.5;
        const w = screenWidth * scale;
        const h = screenHeight * scale;
        const offsetX = (screenWidth - w) / 2;
        const offsetY = (screenHeight - h) / 2 - screenHeight * 0.15;
        ctx.drawImage(this.skybox, offsetX, offsetY, w, h);
    }

    drawObjects(ctx, screenCenterX, screenCenterY, tileHeight, gridToIso) {
        const sorted = [...this.objects].sort((a, b) => {
            const layerA = a.spriteLayer !== undefined ? a.spriteLayer : 0;
            const layerB = b.spriteLayer !== undefined ? b.spriteLayer : 0;
            if (layerA !== layerB) {
                return layerA - layerB;
            }
            const depthA = a.gridX + a.gridY + (a.heightTiles || 0);
            const depthB = b.gridX + b.gridY + (b.heightTiles || 0);
            return depthA - depthB;
        });
        sorted.forEach(obj =>
            obj.draw(ctx, screenCenterX, screenCenterY, tileHeight, gridToIso)
        );
    }

    clear() {
        this.objects = [];
    }

    removeObject(id) {
        this.objects = this.objects.filter(obj => obj.id !== id);
    }
}
