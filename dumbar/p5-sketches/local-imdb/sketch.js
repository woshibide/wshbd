function loadP5Sketch(container) {
    return new p5(function (p) {

        let isPlaying = true; // Initial state is playing

        let updateTimeInterval = 15000;
        let seed;

        // PATTERN
        let periodicMotions = [];
        let patternX = 20;
        let patternY = 30;

        let movieData;

        class PeriodicMotion {
            constructor(x, y) {
                this.angle = 270;
                this.speed = 0.07;
                this.radius = 1000;
                this.sx = 4;
                this.sy = 1;
                this.x1 = x;
                this.y1 = y;
                this.x2 = 0;
                this.y2 = 0;
            }

            update() {
                this.x2 = this.x1 + p.cos(p.radians(this.angle * this.sx)) * this.radius / 2;
                this.y2 = this.y1 + p.sin(p.radians(this.angle * this.sy)) * this.radius / 2;
                this.angle += this.speed;
            }
            display(movieObject) {
                // Check if movieObject is defined before accessing its properties
                if (movieObject) {
                    let userRating = movieObject['User Rating'];

                    let ratingPercentage = p.map(userRating, 0, 10, 0, 100);

                    let startRotation = 0;
                    let endRotation = p.radians(movieObject['Duration']);

                    let interpolatedRotation = p.lerp(startRotation,
                        endRotation,
                        ratingPercentage);

                    p.push();
                    p.translate(this.x2, this.y2);
                    p.rotate(interpolatedRotation);
                    p.fill(0, 150);
                    p.rect(0, 0, 500, 15);
                    p.pop();

                    // push(); // base points
                    // fill('red');
                    // translate(this.x1, this.y1);
                    // rotate(interpolatedRotation);
                    // rect(0, 0, 10, 10); 
                    // pop();
                }
            }
        }

        // function mouseClicked() {
        //     console.log('===================')
        //     TODO: perform a bg change
        // }

        p.setup = function () {

            const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
            canvas.parent(container.querySelector('.canvas-wrapper'));

            p.frameRate(30);
            p.fill("black");
            // p.strokeWeight(0);
            // p.stroke("white");
            p.noStroke();
            p.textSize(20);
            p.textAlign("LEFT");


            // load csv file 
            p.loadTable('/dumbar/p5-sketches/local-imdb/movies/movie_list.csv', 'csv', 'header',
                // callback when loaded
                function (table) {
                    movieData = table;
                    console.log("Movie data loaded! " + movieData.rows.length + " movies found.");

                    for (let x = 0; x < p.width; x += patternX) {
                        for (let y = 0; y < p.height; y += patternY) {
                            periodicMotions.push(new PeriodicMotion(x, y));
                        }
                    }
                },
                // error callback
                function (error) {
                    console.error("Error loading CSV:", error);
                    p.fill(255, 0, 0);
                    p.text("Error loading movie data", p.width / 2, p.height / 2);
                }
            );

            // movieData = p.loadTable("movies/movie_list.csv", "csv", "header", function (data) {
            //     headers = movieData.columns;

            //     // creates instances of based of window size
            //     for (let x = 0; x < p.width; x += patternX) {
            //         for (let y = 0; y < p.height; y += patternY) {
            //             periodicMotions.push(new PeriodicMotion(x, y));
            //         }
            //     }
            // });
        }

        p.draw = function () {

            p.background(235);


            p.push();
            // console.log('===========================');
            // console.log('Frame rate: ' + p.round(p.frameRate()));

            // movie name
            if (movieData.rows.length > 0) {
                var movieRow = movieData.rows[Math.floor(
                    p.millis() / updateTimeInterval) % movieData.rows.length];

                if (movieRow) {
                    var movieObject = movieRow.obj;

                    // CHECK IF THERE IS AN ENGLISH NAME, IF NOT DISPLAY RUSSIAN
                    var movieNameEng = movieObject['NameEng'];
                    var movieNameRus = movieObject['NameRus'];

                    // console.log('--------------');
                    // console.log('English Name:', movieNameEng);
                    // console.log('Russian Name:', movieNameRus);
                    // console.log('Duration:', movieObject['Duration']);

                    if (!movieNameEng) {
                        movieNameEng = movieNameRus;
                    }
                    p.push();
                    p.textSize(20);
                    p.textAlign(p.CENTER, p.CENTER);
                    p.fill("black");
                    p.text(movieNameEng, p.width / 2, p.height / 2);
                    p.pop();

                    p.pop();

                }
            }

            if (!movieData) {
                return;
            }

            p.scale(0.25);
            p.translate(p.width * 2, p.height * 2);

            // PATTERN
            for (let i = 0; i < periodicMotions.length; i++) {

                if (movieData.rows.length > 0) {
                    let movieRow = movieData.rows[Math.floor(
                        p.millis() / updateTimeInterval) % movieData.rows.length];

                    if (movieRow) {
                        let movieObject = movieRow.obj;

                        periodicMotions[i].update();
                        p.rotate(movieObject['Duration']);

                        periodicMotions[i].display(movieObject);
                    }
                }
            }

            p.pop();
        }
    });
}