function resizeCanvas() {
    const container = document.getElementById('canvasContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    screenWidth = canvas.width;
    screenHeight = canvas.height;
}

let ghostObject = null;
let ghostGridPos = { x: 0, y: 0 };

function mainLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const offset = camera.getOffset();
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(offset.scale, offset.scale);
    
    objectManager.drawSkybox(ctx, screenWidth, screenHeight);
    
    for (let y = 0; y < mapHeight; y++) {
        drawWall(0, y, 'left');
    }
    
    for (let x = 0; x < mapWidth; x++) {
        drawWall(x, 0, 'back');
    }
    
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            drawTile(x, y, (x + y) % 2 === 0 ? gColor1 : gColor2);
        }
    }
    
    objectManager.drawObjects(ctx, screenWidth / 2, 117, tileHeight, gridToIso);
    
    let highlightObject = null;
    
    if (editor.currentTool === 'place') {
        highlightObject = ghostObject;
    } else if (editor.currentTool === 'select') {
        if (editor.selectedObject) {
            highlightObject = objectManager.objects.find(o => o.id === editor.selectedObject);
        }
    }
    
    if (highlightObject) {
        ctx.globalAlpha = (editor.currentTool === 'place') ? 0.5 : 1.0;
        
        if (editor.currentTool === 'place') {
            highlightObject.draw(ctx, screenWidth / 2, 117, tileHeight, gridToIso);
        }
        
        ctx.globalAlpha = 1.0;
        
        const widthTiles = highlightObject.widthTiles || 1;
        const heightTiles = highlightObject.heightTiles || 1;
        const pos = gridToIso(highlightObject.gridX, highlightObject.gridY);
        
        pos.x += screenWidth / 2;
        pos.y += 120;
        
        ctx.strokeStyle = (editor.currentTool === 'place') ? '#4a90e2' : '#ffa500';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x + widthTiles * tileWidth / 2, pos.y + heightTiles * tileHeight / 2);
        ctx.lineTo(pos.x, pos.y + heightTiles * tileHeight);
        ctx.lineTo(pos.x - widthTiles * tileWidth / 2, pos.y + heightTiles * tileHeight / 2);
        ctx.closePath();
        ctx.stroke();
    }
    
    ctx.restore();
    requestAnimationFrame(mainLoop);
}

const editor = {
    sprites: [],
    selectedSprite: null,
    selectedObject: null,
    currentTool: 'place',
    gridSnap: true,
    draggingObject: null,
    dragOffset: { x: 0, y: 0 },

    init() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        camera.init();
        this.setupEventListeners();
        mainLoop();
    },

    setupEventListeners() {
        document.getElementById('applyWorldSettings').addEventListener('click', () => this.applyWorldSettings());
        
        this.setupColorPicker('groundColor1');
        this.setupColorPicker('groundColor2');
        this.setupColorPicker('wallColor');
        this.setupColorPicker('wallShade');
        
        document.getElementById('skyboxUpload').addEventListener('change', (e) => this.handleSkyboxUpload(e));
        document.getElementById('clearSkybox').addEventListener('click', () => this.clearSkybox());
        document.getElementById('spriteUpload').addEventListener('change', (e) => this.handleSpriteUpload(e));
        
        document.getElementById('placeTool').addEventListener('click', () => this.setTool('place'));
        document.getElementById('selectTool').addEventListener('click', () => this.setTool('select'));
        document.getElementById('deleteTool').addEventListener('click', () => this.setTool('delete'));
        
        document.getElementById('gridSnap').addEventListener('change', (e) => {
            this.gridSnap = e.target.checked;
        });
        
        canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        canvas.addEventListener('mousemove', (e) => this.handleCanvasMove(e));
        canvas.addEventListener('mouseleave', () => {
            ghostObject = null;
        });
        canvas.addEventListener('mousedown', (e) => this.startDrag(e));
        canvas.addEventListener('mouseup', (e) => this.stopDrag(e));
        
        document.getElementById('exportProject').addEventListener('click', () => this.exportProject());
        document.getElementById('importProject').addEventListener('change', (e) => this.importProject(e));
        
        document.querySelectorAll('.panel-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                header.nextElementSibling.classList.toggle('collapsed');
            });
        });
    },

    setupColorPicker(id) {
        const colorPicker = document.getElementById(id);
        const textInput = document.getElementById(id + 'Text');
        
        colorPicker.addEventListener('input', (e) => {
            textInput.value = e.target.value;
        });
        
        textInput.addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                colorPicker.value = e.target.value;
            }
        });
    },

    applyWorldSettings() {
        mapWidth = parseInt(document.getElementById('mapWidth').value) || 10;
        mapHeight = parseInt(document.getElementById('mapHeight').value) || 10;
        tileWidth = parseInt(document.getElementById('tileWidth').value) || 64;
        tileHeight = parseInt(document.getElementById('tileHeight').value) || 32;
        wallHeight = parseInt(document.getElementById('wallHeight').value) || 80;
        gColor1 = document.getElementById('groundColor1').value;
        gColor2 = document.getElementById('groundColor2').value;
        wallColor = document.getElementById('wallColor').value;
        wallShade = document.getElementById('wallShade').value;
    },

    startDrag(e) {
        if (this.currentTool !== 'select') return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const gridPos = this.screenToGrid(x, y);
        const tolerance = 0.5;
        
        const obj = objectManager.objects.find(o =>
            Math.abs(o.gridX - gridPos.x) < tolerance &&
            Math.abs(o.gridY - gridPos.y) < tolerance
        );
        
        if (obj) {
            this.draggingObject = obj;
            this.selectedObject = obj.id;
            this.dragOffset.x = gridPos.x - obj.gridX;
            this.dragOffset.y = gridPos.y - obj.gridY;
            this.updateObjectList();
        }
    },

    dragObject(e) {
        if (!this.draggingObject) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const gridPos = this.screenToGrid(x, y);
        
        let newX = this.gridSnap ? Math.round(gridPos.x - this.dragOffset.x) : gridPos.x - this.dragOffset.x;
        let newY = this.gridSnap ? Math.round(gridPos.y - this.dragOffset.y) : gridPos.y - this.dragOffset.y;
        
        this.draggingObject.gridX = newX;
        this.draggingObject.gridY = newY;
    },

    stopDrag() {
        this.draggingObject = null;
    },

    handleSkyboxUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            objectManager.setSkybox(event.target.result);
            
            const preview = document.getElementById('skyboxPreview');
            preview.style.display = 'block';
            preview.querySelector('img').src = event.target.result;
            
            const clearBtn = document.getElementById('clearSkybox');
            clearBtn.style.display = 'block';
        };
        reader.readAsDataURL(file);
    },

    clearSkybox() {
        objectManager.skybox = null;
        objectManager.skyboxLoaded = false;
        document.getElementById('skyboxPreview').style.display = 'none';
        
        const clearBtn = document.getElementById('clearSkybox');
        clearBtn.style.display = 'none';
    },

    handleSpriteUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const name = file.name;
            const sprite = {
                id: Math.random().toString(36).substr(2, 9),
                name: name,
                src: event.target.result
            };
            this.sprites.push(sprite);
            this.updateSpriteLibrary();
            document.getElementById('spriteName').value = '';
        };
        reader.readAsDataURL(file);
    },

    updateSpriteLibrary() {
        const container = document.getElementById('spriteLibrary');
        container.innerHTML = '';
        
        if (this.sprites.length === 0) {
            container.innerHTML = '<div class="info-text" style="grid-column: 1/-1; text-align: center; padding: 20px;">no sprites loaded., upload sprites to begin</div>';
            return;
        }

        this.sprites.forEach((sprite, index) => {
            const item = document.createElement('div');
            item.className = 'sprite-item';
            item.draggable = true;
            
            if (this.selectedSprite === sprite.id) {
                item.classList.add('selected');
            }

            const img = document.createElement('img');
            img.src = sprite.src;
            item.appendChild(img);

            const name = document.createElement('div');
            name.className = 'sprite-item-name';
            name.textContent = sprite.name;
            item.appendChild(name);

            const actions = document.createElement('div');
            actions.className = 'sprite-item-actions';
            
            const renameBtn = document.createElement('img');
            renameBtn.src = 'assets/img/edit.png';
            renameBtn.className = 'sprite-action-btn';
            renameBtn.title = 'Rename';
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const extIndex = sprite.name.lastIndexOf('.');
                const nameWithoutExt = extIndex >= 0 ? sprite.name.slice(0, extIndex) : sprite.name;
                const extension = extIndex >= 0 ? sprite.name.slice(extIndex) : '';
                
                name.contentEditable = "true";
                name.textContent = nameWithoutExt;
                name.focus();
                
                const range = document.createRange();
                range.selectNodeContents(name);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                
                const finishRename = () => {
                    name.contentEditable = "false";
                    sprite.name = name.textContent + extension;
                    name.removeEventListener('blur', finishRename);
                    name.removeEventListener('keydown', onEnter);
                };
                
                const onEnter = (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        finishRename();
                    }
                };
                
                name.addEventListener('blur', finishRename);
                name.addEventListener('keydown', onEnter);
            });
            actions.appendChild(renameBtn);

            const deleteBtn = document.createElement('img');
            deleteBtn.src = 'assets/img/delete.png';
            deleteBtn.className = 'sprite-action-btn';
            deleteBtn.title = 'Delete';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.sprites = this.sprites.filter(s => s.id !== sprite.id);
                
                if (this.selectedSprite === sprite.id) {
                    this.selectedSprite = null;
                }
                
                this.updateSpriteLibrary();
                this.updateAllSpriteLayers();
            });
            actions.appendChild(deleteBtn);
            item.appendChild(actions);

            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = index;
                const moved = this.sprites.splice(fromIndex, 1)[0];
                this.sprites.splice(toIndex, 0, moved);
                this.updateSpriteLibrary();
                this.updateAllSpriteLayers();
            });

            item.addEventListener('click', () => {
                this.selectedSprite = (this.selectedSprite === sprite.id) ? null : sprite.id;
                this.updateSpriteLibrary();
            });

            container.appendChild(item);
        });
    },

    updateObjectList() {
        const container = document.getElementById('objectList');
        const clearBtn = document.getElementById('clearObjects');
        clearBtn.style.display = objectManager.objects.length > 0 ? 'block' : 'none';

        container.innerHTML = '';
        
        if (objectManager.objects.length === 0) {
            container.innerHTML = '<div class="info-text" style="padding: 20px; text-align: center;">no objects in scene</div>';
            return;
        }
        
        const sortedObjects = [...objectManager.objects].sort((a, b) => {
            const layerA = a.spriteLayer !== undefined ? a.spriteLayer : -1;
            const layerB = b.spriteLayer !== undefined ? b.spriteLayer : -1;
            return layerA - layerB;
        });
        
        sortedObjects.forEach(obj => {
            const sprite = this.sprites.find(s => s.id === obj.spriteId);
            const spriteName = sprite ? sprite.name : 'Unknown';
            
            const item = document.createElement('div');
            item.className = 'object-item';
            
            if (this.selectedObject === obj.id) {
                item.classList.add('selected');
            }
            
            const info = document.createElement('span');
            info.textContent = `${spriteName} (${obj.gridX}, ${obj.gridY})`;
            item.appendChild(info);
            
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'object-item-delete';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteObject(obj.id);
            });
            item.appendChild(deleteBtn);
            
            item.addEventListener('click', () => {
                this.selectedObject = (this.selectedObject === obj.id) ? null : obj.id;
                this.updateObjectList();
            });
            
            container.appendChild(item);
        });
    },

    updateAllSpriteLayers() {
        objectManager.objects.forEach(obj => {
            const spriteIndex = this.sprites.findIndex(s => s.id === obj.spriteId);
            if (spriteIndex !== -1) {
                obj.spriteLayer = spriteIndex;
            }
        });
        this.updateObjectList();
    },

    setTool(tool) {
        this.currentTool = tool;
        
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(tool + 'Tool').classList.add('active');
        
        if (tool === 'place') {
            canvas.style.cursor = 'crosshair';
        } else if (tool === 'select') {
            canvas.style.cursor = 'pointer';
        } else if (tool === 'delete') {
            canvas.style.cursor = 'not-allowed';
        }
        
        if (tool !== 'place') {
            ghostObject = null;
        }
    },

    handleCanvasMove(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const gridPos = this.screenToGrid(x, y);
        
        const finalX = this.gridSnap ? Math.round(gridPos.x) : gridPos.x;
        const finalY = this.gridSnap ? Math.round(gridPos.y) : gridPos.y;
        
        this.hoveredGrid = { x: finalX, y: finalY };
        
        if (this.currentTool === 'place' && this.selectedSprite) {
            const sprite = this.sprites.find(s => s.id === this.selectedSprite);
            if (!sprite) return;
            
            if (!ghostObject) {
                ghostObject = new IsometricObject(finalX, finalY, sprite.src);
                ghostObject.freePlacement = !this.gridSnap;
            } else {
                ghostObject.gridX = finalX;
                ghostObject.gridY = finalY;
                ghostObject.freePlacement = !this.gridSnap;
            }
        } else {
            ghostObject = null;
        }
    },

    handleCanvasClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const gridPos = this.screenToGrid(x, y);
        
        if (this.currentTool === 'place' && this.selectedSprite) {
            this.placeObject(gridPos.x, gridPos.y);
        } else if (this.currentTool === 'delete') {
            this.deleteObjectAtPosition(gridPos.x, gridPos.y);
        }
    },

    placeObject(gridX, gridY) {
        if (this.gridSnap) {
            gridX = Math.round(gridX);
            gridY = Math.round(gridY);
        }
        
        const sprite = this.sprites.find(s => s.id === this.selectedSprite);
        if (!sprite) return;
        
        const spriteLayer = this.sprites.findIndex(s => s.id === this.selectedSprite);
        const obj = objectManager.addObject(gridX, gridY, sprite.src);
        obj.spriteId = this.selectedSprite;
        obj.spriteLayer = spriteLayer;
        obj.freePlacement = !this.gridSnap;
        
        this.updateObjectList();
    },

    deleteObject(id) {
        objectManager.removeObject(id);
        
        if (this.selectedObject === id) {
            this.selectedObject = null;
        }
        
        this.updateObjectList();
    },

    deleteObjectAtPosition(gridX, gridY) {
        if (this.gridSnap) {
            gridX = Math.round(gridX);
            gridY = Math.round(gridY);
        }
        
        const obj = objectManager.objects.find(o => o.gridX === gridX && o.gridY === gridY);
        if (obj) {
            this.deleteObject(obj.id);
        }
    },

    clearAllObjects() {
        if (confirm('are you sure you want to clear all objects???')) {
            objectManager.clear();
            this.selectedObject = null;
            this.updateObjectList();
        }
    },

    screenToGrid(screenX, screenY) {
        const worldPos = camera.screenToWorld(screenX, screenY);
        const centerX = screenWidth / 2;
        const centerY = 120;
        const isoX = worldPos.x - centerX;
        const isoY = worldPos.y - centerY;
        const gridX = (isoX / (tileWidth / 2) + isoY / (tileHeight / 2)) / 2;
        const gridY = (isoY / (tileHeight / 2) - isoX / (tileWidth / 2)) / 2;
        
        return { x: gridX, y: gridY };
    },

    exportProject() {
        const project = {
            version: '1.0',
            config: {
                mapWidth: mapWidth,
                mapHeight: mapHeight,
                tileWidth: tileWidth,
                tileHeight: tileHeight,
                wallHeight: wallHeight,
                groundColor1: gColor1,
                groundColor2: gColor2,
                wallColor: wallColor,
                wallShade: wallShade
            },
            sprites: this.sprites,
            objects: objectManager.objects.map(o => ({
                id: o.id,
                gridX: o.gridX,
                gridY: o.gridY,
                spriteId: o.spriteId,
                spriteLayer: o.spriteLayer,
                src: o.src,
                offset: o.offset
            })),
            skybox: objectManager.skybox ? objectManager.skybox.src : null
        };
        
        const blob = new Blob([JSON.stringify(project, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'project.swag';
        a.click();
        URL.revokeObjectURL(url);
    },

    importProject(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const project = JSON.parse(event.target.result);
                
                mapWidth = project.config.mapWidth;
                mapHeight = project.config.mapHeight;
                tileWidth = project.config.tileWidth;
                tileHeight = project.config.tileHeight;
                wallHeight = project.config.wallHeight;
                gColor1 = project.config.groundColor1;
                gColor2 = project.config.groundColor2;
                wallColor = project.config.wallColor;
                wallShade = project.config.wallShade;
                
                document.getElementById('mapWidth').value = mapWidth;
                document.getElementById('mapHeight').value = mapHeight;
                document.getElementById('tileWidth').value = tileWidth;
                document.getElementById('tileHeight').value = tileHeight;
                document.getElementById('wallHeight').value = wallHeight;
                document.getElementById('groundColor1').value = gColor1;
                document.getElementById('groundColor1Text').value = gColor1;
                document.getElementById('groundColor2').value = gColor2;
                document.getElementById('groundColor2Text').value = gColor2;
                document.getElementById('wallColor').value = wallColor;
                document.getElementById('wallColorText').value = wallColor;
                document.getElementById('wallShade').value = wallShade;
                document.getElementById('wallShadeText').value = wallShade;
                
                this.sprites = project.sprites || [];
                objectManager.clear();
                
                if (project.objects) {
                    project.objects.forEach(objData => {
                        const obj = objectManager.addObject(objData.gridX, objData.gridY, objData.src, objData.offset);
                        obj.id = objData.id;
                        obj.spriteId = objData.spriteId;
                        obj.spriteLayer = objData.spriteLayer !== undefined ? objData.spriteLayer : 0;
                    });
                }
                
                if (project.skybox) {
                    objectManager.setSkybox(project.skybox);
                    const preview = document.getElementById('skyboxPreview');
                    preview.style.display = 'block';
                    preview.querySelector('img').src = project.skybox;
                }
                
                this.updateSpriteLibrary();
                this.updateObjectList();
                alert('project loaded!!!');
            } catch (err) {
                alert('error loading project: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
};

editor.init();
