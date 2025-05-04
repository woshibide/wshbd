function loadP5Sketch(container) {
    return new p5(function (p) {
        let objSize = 10;
        let mashtab = 2;
        
        p.setup = function() {
            const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
            canvas.parent(container.querySelector('.canvas-wrapper'));
            p.colorMode(p.HSB, 360, 100, 100);
            p.textAlign(p.LEFT, p.CENTER);
            p.textSize(objSize);
            p.background(360);
            p.frameRate(20);
        };
        
        p.patternMe = function(foo) {
            for (let x = 0; x < p.width; x += foo) {
                for (let y = 0; y < p.height; y += foo) {
                    
                    let shouldFill = (Math.floor(x / foo) + Math.floor(y / foo)) % 2 == 0;
                    
                    if (shouldFill) {
                        p.fill(p.random(320, 340), 100, 100);
                        p.text("💗", x + foo / 2, y + foo / 2);
                    } else {
                        p.fill(p.random(220, 240), 80, 60);
                        p.text("❤️", x + foo / 2, y + foo / 2);
                    }
                }
            }
        };
        
        p.draw = function() {
            p.push();
            p.translate(-1 * (p.width / 6), 0);
            p.textSize(objSize);
            if (objSize >= p.height / mashtab || objSize >= p.width / mashtab) {
                objSize = 0;
                p.background(360);
            }
            else { 
                objSize += 10; 
                p.patternMe(objSize);  
            }
            p.pop();
            
            p.textSize(36);
            p.fill(180, 100, 100);
            // valentine's message
            p.text("you've being bombarded with love", 50, p.height - 140);
            p.text("from: pyotr", 50, p.height - 80);
            p.text("to: everyone", 50, p.height - 40);
        };
        
        p.windowResized = function() {
            p.resizeCanvas(container.clientWidth, container.clientHeight);
            objSize = 10; // reset pattern size on resize
        };
    });
}
