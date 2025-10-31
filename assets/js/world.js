const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let screenWidth = canvas.width;
let screenHeight = canvas.height;
let mapWidth = 10;
let mapHeight = 10;
let tileWidth = 64;
let tileHeight = 32;
let wallHeight = 80;
let gColor1 = "#d2b48c";
let gColor2 = "#bfa078";
let wallColor = "#d2b48c";
let wallShade = "#977b56";

const objectManager = new ObjectManager();

function gridToIso(x, y) {
    return {
        x: (x - y) * tileWidth / 2,
        y: (x + y) * tileHeight / 2
    };
}

function drawTile(x, y, color) {
    const pos = gridToIso(x, y);
    pos.x += screenWidth / 2;
    pos.y += 120;
    const points = [
        { x: pos.x, y: pos.y },
        { x: pos.x + tileWidth / 2, y: pos.y + tileHeight / 2 },
        { x: pos.x, y: pos.y + tileHeight },
        { x: pos.x - tileWidth / 2, y: pos.y + tileHeight / 2 }
    ];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[3].x, points[3].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(points[1].x, points[1].y);
    ctx.lineTo(points[3].x, points[3].y);
    ctx.lineTo(points[2].x, points[2].y);
    ctx.closePath();
    ctx.fill();
}

function drawWall(x, y, side) {
    const pos = gridToIso(x, y);
    pos.x += screenWidth / 2;
    pos.y += 120;

    if (side === 'left') {
        ctx.fillStyle = wallShade;
        ctx.beginPath();
        ctx.moveTo(pos.x - tileWidth / 2, pos.y + tileHeight / 2);
        ctx.lineTo(pos.x - tileWidth / 2, pos.y + tileHeight / 2 - wallHeight);
        ctx.lineTo(pos.x, pos.y - wallHeight);
        ctx.lineTo(pos.x, pos.y);
        ctx.closePath();
        ctx.fill();
    } else if (side === 'back') {
        ctx.fillStyle = wallColor;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x, pos.y - wallHeight);
        ctx.lineTo(pos.x + tileWidth / 2, pos.y + tileHeight / 2 - wallHeight);
        ctx.lineTo(pos.x + tileWidth / 2, pos.y + tileHeight / 2);
        ctx.closePath();
        ctx.fill();
    }
}
