function loadP5Sketch(container) {
    return new p5(function (p) {
        let rows = 45;
        let cols = 65;
        let hp = 25;
        let vp = 25;

        let animationPaused = false;
        let noiseOffsetX = 0;
        let noiseOffsetY = 1000;

        p.setup = function() {
            const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
            canvas.parent(container.querySelector('.canvas-wrapper'));
            
            // adjust rows and cols based on canvas dimensions
            hp = p.width / rows;
            vp = p.height / cols;
            
            p.frameRate(12);
            p.noStroke();
            p.colorMode(p.HSB, 360, 100, 100); 
        };

        p.draw = function() {
            if (!animationPaused) {
                p.background(255);
                noiseOffsetX += 0.1;
                noiseOffsetY += 0.1;
                for (let x = 0; x < rows; x++) { 
                    for (let y = 0; y < cols; y++) { 
                        p.simchaPixel(x * hp, y * vp, x, y); 
                    }
                }
            }
        };

        // generate color based on 2d noise
        p.noiseFill = function(x, y) {
            let h = p.map(p.noise(x * 0.1 + noiseOffsetX,
                                        y * 0.1 + noiseOffsetY),
                                        0, 1, 0, 360);
            let s = p.map(p.noise(x * 0.1 + noiseOffsetX,
                                        y * 0.1 + noiseOffsetY),
                                        0, 1, 20, 100);
            let b = p.map(p.noise(x * 0.1 + noiseOffsetX,
                                        y * 0.1 + noiseOffsetY),
                                        0, 1, 80, 100);
            p.fill(h, s, b);
        };

        // draw circle on top of rectangle
        p.simchaPixel = function(x, y, gridX, gridY) {
            // calculates the height and width of each rectangle so it fills whole canvas
            let rectWidth = p.width / rows;
            let rectHeight = p.height / cols;

            // draws rectangle with noise-based fill
            p.noiseFill(gridX, gridY);
            p.rect(x, y, rectWidth, rectHeight);

            // draws a circle with noise-based fill in the middle of the rectangle
            let circleX = x + rectWidth / 2;
            let circleY = y + rectHeight / 2;
            let circleRadius = p.min(rectWidth, rectHeight) * 0.8;
            p.noiseFill(gridX + 0.5, gridY + 0.5);
            p.circle(circleX, circleY, circleRadius);
        };
        
        p.windowResized = function() {
            p.resizeCanvas(container.clientWidth, container.clientHeight);
            hp = p.width / rows;
            vp = p.height / cols;
        };
    });
}
