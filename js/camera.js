// Camera system for navigating large maps
class Camera {
    constructor(canvasWidth, canvasHeight, worldWidth, worldHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

        // Camera position (top-left corner of viewport)
        this.x = 0;
        this.y = 0;

        // Zoom level (1.0 = 100%)
        this.zoom = 1.0;
        this.minZoom = 0.25; // 25%
        this.maxZoom = 3.0;   // 300%

        // Pan settings
        this.panSpeed = 50;
        this.smoothPan = true;
        this.targetX = 0;
        this.targetY = 0;

        // Mouse interaction
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
    }

    // Update camera position (smooth panning)
    update() {
        if (this.smoothPan) {
            const lerpSpeed = 0.1;
            this.x += (this.targetX - this.x) * lerpSpeed;
            this.y += (this.targetY - this.y) * lerpSpeed;
        } else {
            this.x = this.targetX;
            this.y = this.targetY;
        }

        // Keep camera within world bounds
        this.constrainToWorld();
    }

    // Set camera target position
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    // Move camera by offset
    pan(deltaX, deltaY) {
        this.targetX += deltaX;
        this.targetY += deltaY;
    }

    // Center camera on a point
    centerOn(x, y) {
        this.targetX = x - (this.canvasWidth / this.zoom) / 2;
        this.targetY = y - (this.canvasHeight / this.zoom) / 2;
    }

    // Zoom in/out
    setZoom(newZoom) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

        // Adjust position to zoom from center
        const centerX = this.x + (this.canvasWidth / oldZoom) / 2;
        const centerY = this.y + (this.canvasHeight / oldZoom) / 2;

        this.targetX = centerX - (this.canvasWidth / this.zoom) / 2;
        this.targetY = centerY - (this.canvasHeight / this.zoom) / 2;
    }

    // Zoom by factor
    zoomBy(factor) {
        this.setZoom(this.zoom * factor);
    }

    // Keep camera within world boundaries
    constrainToWorld() {
        const viewWidth = this.canvasWidth / this.zoom;
        const viewHeight = this.canvasHeight / this.zoom;

        this.targetX = Math.max(0, Math.min(this.worldWidth - viewWidth, this.targetX));
        this.targetY = Math.max(0, Math.min(this.worldHeight - viewHeight, this.targetY));

        this.x = Math.max(0, Math.min(this.worldWidth - viewWidth, this.x));
        this.y = Math.max(0, Math.min(this.worldHeight - viewHeight, this.y));
    }

    // Apply camera transformation to canvas context
    applyTransform(ctx) {
        ctx.save();
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }

    // Remove camera transformation
    removeTransform(ctx) {
        ctx.restore();
    }

    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX / this.zoom) + this.x,
            y: (screenY / this.zoom) + this.y
        };
    }

    // Convert world coordinates to screen coordinates
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.x) * this.zoom,
            y: (worldY - this.y) * this.zoom
        };
    }

    // Check if a world position is visible on screen
    isVisible(worldX, worldY, margin = 0) {
        const viewLeft = this.x - margin;
        const viewRight = this.x + (this.canvasWidth / this.zoom) + margin;
        const viewTop = this.y - margin;
        const viewBottom = this.y + (this.canvasHeight / this.zoom) + margin;

        return worldX >= viewLeft && worldX <= viewRight &&
            worldY >= viewTop && worldY <= viewBottom;
    }

    // Check if a rectangular area is visible
    isAreaVisible(x, y, width, height) {
        const viewLeft = this.x;
        const viewRight = this.x + (this.canvasWidth / this.zoom);
        const viewTop = this.y;
        const viewBottom = this.y + (this.canvasHeight / this.zoom);

        return !(x + width < viewLeft || x > viewRight ||
            y + height < viewTop || y > viewBottom);
    }

    // Handle mouse events for camera control
    handleMouseDown(e) {
        this.isDragging = true;
        const rect = e.target.getBoundingClientRect();
        this.lastMouseX = e.clientX - rect.left;
        this.lastMouseY = e.clientY - rect.top;
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;

        const rect = e.target.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const deltaX = (mouseX - this.lastMouseX) / this.zoom;
        const deltaY = (mouseY - this.lastMouseY) / this.zoom;

        this.pan(-deltaX, -deltaY);

        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;
    }

    handleMouseUp(e) {
        this.isDragging = false;
    }

    handleWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoomBy(zoomFactor);
    }

    // Get camera info for UI display
    getInfo() {
        return {
            x: Math.round(this.x),
            y: Math.round(this.y),
            zoom: Math.round(this.zoom * 100),
            viewWidth: Math.round(this.canvasWidth / this.zoom),
            viewHeight: Math.round(this.canvasHeight / this.zoom)
        };
    }
}

export { Camera };