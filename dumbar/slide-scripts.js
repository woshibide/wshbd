// wait for dom to load before running script
document.addEventListener('DOMContentLoaded', function() {
    // get all slides
    const projectWrappers = document.querySelectorAll('.slide-project-wrapper');
    const aSlides = document.querySelectorAll('.a-slide');
    const totalSlides = aSlides.length;
    
    // set up navigation elements
    const slidesNavElement = document.getElementById('slides-nav');
    const currentSlideNumberContainer = document.getElementById('slides-current-number-container');
    const totalSlidesNumberElement = document.getElementById('slides-total-number');
    const currentProjectContainer = document.getElementById('slides-current-project-container');
    
    // set up animation variables
    let currentSlideIndex = 0;
    let currentProjectId = '';
    
    // update total slides in navigation
    // subtract 1 because the first slide ('hello') doesn't count towards the project total
    totalSlidesNumberElement.textContent = String(totalSlides - 1).padStart(2, '0');
    
    // populate the slide numbers container
    function populateSlideNumbers() {
        currentSlideNumberContainer.innerHTML = '';
        
        // create a number element for each slide
        for (let i = 0; i < totalSlides; i++) {
            const numberElement = document.createElement('div');
            numberElement.className = 'number';
            numberElement.textContent = String(i).padStart(2, '0');
            currentSlideNumberContainer.appendChild(numberElement);
        }
    }
    
    // populate the project names container
    function populateProjectNames() {
        currentProjectContainer.innerHTML = '';
        
        // collect unique project ids
        const projectIds = [];
        projectWrappers.forEach(wrapper => {
            const id = wrapper.id;
            if (!projectIds.includes(id) && id !== 'slide-hello') {
                projectIds.push(id);
            }
        });
        
        // create placeholder for hello slide
        const helloElement = document.createElement('div');
        helloElement.className = 'project-name';
        helloElement.textContent = '';
        currentProjectContainer.appendChild(helloElement);
        
        // create a project name element for each project
        projectIds.forEach(id => {
            const projectElement = document.createElement('div');
            projectElement.className = 'project-name';
            projectElement.textContent = id;
            currentProjectContainer.appendChild(projectElement);
        });
    }
    
    // initialize intersection observer to detect current slide
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5 // slide needs to be at least 50% visible to be considered "current"
    };
    
    // function to update navigation based on current slide
    function updateNavigation(slideElement) {
        // find the index of the current slide
        const slideIndex = Array.from(aSlides).indexOf(slideElement);
        
        // only update if the slide index has changed
        if (slideIndex !== currentSlideIndex) {
            // get project name from parent slide-project-wrapper's id
            const projectWrapper = slideElement.closest('.slide-project-wrapper');
            const projectId = projectWrapper ? projectWrapper.id : 'unknown';
            
            // check if we're on the hello slide
            const isHelloSlide = projectId === 'slide-hello';
            
            // toggle hello-slide class on nav for opacity effect
            if (isHelloSlide) {
                slidesNavElement.classList.add('hello-slide');
            } else {
                slidesNavElement.classList.remove('hello-slide');
            }
            
            // update the slide number by transforming the container
            const transformAmount = -slideIndex * 1.2; // 1.2em is the height of each number element
            currentSlideNumberContainer.style.transform = `translateY(${transformAmount}em)`;
            
            // update the project name by transforming the container
            if (projectId !== currentProjectId) {
                // find the index of the project in our container
                const projectIndex = isHelloSlide ? 0 : Array.from(projectWrappers)
                    .filter(wrapper => wrapper.id !== 'slide-hello')
                    .findIndex(wrapper => wrapper.id === projectId) + 1;  // +1 for the hello slide placeholder
                
                // transform the project container
                if (projectIndex >= 0) {
                    currentProjectContainer.style.transform = `translateY(${-projectIndex * 1.2}em)`;
                }
                
                currentProjectId = projectId;
            }
            
            currentSlideIndex = slideIndex;
            
            // update url hash without triggering a scroll
            if (!isHelloSlide) {
                const newUrl = window.location.pathname + '#' + projectId;
                history.replaceState(null, null, newUrl);
            }
        }
    }
    
    // manage p5.js sketches visibility
    function handleP5Visibility(slideElement, isIntersecting) {
        const p5Container = slideElement.querySelector('.p5js-container');
        if (p5Container) {
            if (isIntersecting && !p5Container.classList.contains('initialized')) {
                // initialize p5 sketch if it's visible and not already initialized
                const sketchId = p5Container.getAttribute('data-sketch-id');
                if (sketchId) {
                    initializeP5Sketch(p5Container.id, sketchId);
                }
            } else if (!isIntersecting && p5Container.classList.contains('initialized')) {
                // deactivate p5 sketch when it's not visible anymore
                deactivateP5Sketch(p5Container);
            }
        }
    }
    
    // deactivate p5 sketch to save resources
    function deactivateP5Sketch(p5Container) {
        // p5 instance is stored in the container's sketchInstance property
        if (p5Container.sketchInstance) {
            // remove the canvas element
            const canvasWrapper = p5Container.querySelector('.canvas-wrapper');
            if (canvasWrapper && canvasWrapper.firstChild) {
                canvasWrapper.removeChild(canvasWrapper.firstChild);
            }
            
            // call any cleanup methods if available
            if (typeof p5Container.sketchInstance.remove === 'function') {
                p5Container.sketchInstance.remove();
            }
            
            // mark as not initialized so it can be recreated when visible again
            p5Container.classList.remove('initialized');
            p5Container.sketchInstance = null;
        }
    }
    
    // manage video iframes visibility
    function handleVideoVisibility(slideElement, isIntersecting) {
        const videoContainer = slideElement.querySelector('.video-container iframe');
        if (videoContainer) {
            if (isIntersecting) {
                // if vimeo player api is loaded
                if (window.Vimeo && typeof window.Vimeo.Player === 'function') {
                    try {
                        // try to get or create a player instance
                        if (!videoContainer.player) {
                            videoContainer.player = new Vimeo.Player(videoContainer);
                        }
                        videoContainer.player.play();
                    } catch (e) {
                        console.warn('could not initialize vimeo player:', e);
                    }
                }
            } else {
                // pause the video when not in view
                if (videoContainer.player) {
                    videoContainer.player.pause();
                }
            }
        }
    }
    
    // populate the slide numbers and project names containers
    populateSlideNumbers();
    populateProjectNames();
    
    // set up observer for a-slides
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // handle p5js and video visibility
            handleP5Visibility(entry.target, entry.isIntersecting);
            handleVideoVisibility(entry.target, entry.isIntersecting);
            
            if (entry.isIntersecting) {
                updateNavigation(entry.target);
            }
        });
    }, options);
    
    // observe all a-slides
    aSlides.forEach(slide => {
        observer.observe(slide);
    });
    
    // handle initial hash navigation
    function navigateToHash() {
        const hash = window.location.hash;
        if (hash) {
            const targetId = hash.substring(1); // remove the # character
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                // scroll to the target element with a slight delay to ensure proper loading
                setTimeout(() => {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }, 100);
                
                // find the first a-slide within the target and update navigation
                const targetSlide = targetElement.querySelector('.a-slide');
                if (targetSlide) {
                    updateNavigation(targetSlide);
                }
                return true;
            }
        }
        return false;
    }
    
    // navigate to hash on page load if present
    if (!navigateToHash()) {
        // if no hash or invalid hash, show the first slide
        if (aSlides.length > 0) {
            updateNavigation(aSlides[0]);
        }
    }
    
    // p5.js functionality with curtain animation
    function initializeP5Sketch(containerId, sketchId = 'default') {
        const container = document.getElementById(containerId);
        if (!container || container.classList.contains('initialized')) return;
        
        // mark as initialized so it doesn't set up multiple times
        container.classList.add('initialized');
        
        // get curtain elements
        const curtain = container.querySelector('.canvas-curtain');
        const leftCurtain = container.querySelector('.canvas-curtain-half.left');
        const rightCurtain = container.querySelector('.canvas-curtain-half.right');
        const loadingPercentage = container.querySelector('.canvas-loading-percentage');
        
        // determine which sketch to load based on sketchId
        let sketchPath = `/dumbar/p5-sketches/${sketchId}/sketch.js`;
        
        // keep track of loading progress
        let loadingProgress = 0;
        let loadingComplete = false;
        let loadingStartTime = Date.now();
        
        // simulate loading progress
        const updateProgress = () => {
            if (loadingComplete) return;
            
            // calculate elapsed time since loading started
            const elapsed = Date.now() - loadingStartTime;
            
            // simulate loading progress based on time
            // use an easing function to make it feel more natural
            const progress = Math.min(Math.floor(ease(elapsed / 3000) * 100), 99);
            
            if (progress > loadingProgress) {
                loadingProgress = progress;
                loadingPercentage.textContent = `${loadingProgress}%`;
            }
            
            requestAnimationFrame(updateProgress);
        };
        
        // easing function for progress simulation
        function ease(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }
        
        // start progress animation
        updateProgress();
        
        // attempt to load the sketch script
        const scriptElem = document.createElement('script');
        scriptElem.src = sketchPath;
        
        scriptElem.onload = function() {
            // mark as complete
            loadingComplete = true;
            loadingProgress = 100;
            loadingPercentage.textContent = '100%';
            
            // delay to show 100%
            // TODO: only needed in production
            setTimeout(() => {
                if (typeof loadP5Sketch === 'function') {
                    // use the script's loadP5Sketch function with curtain animation
                    const sketch = loadP5Sketch(container);
                    
                    // store sketch instance for later cleanup
                    container.sketchInstance = sketch;
                    
                    // open curtains when sketch is loaded
                    setTimeout(() => {
                        loadingPercentage.classList.add('hidden');
                        leftCurtain.classList.add('open');
                        rightCurtain.classList.add('open');
                        
                        // remove loader after animation completes
                        setTimeout(() => {
                            curtain.style.display = 'none';
                        }, 1200);
                    }, 200);
                } else {
                    // fallback to default sketch if no loadP5Sketch function found
                    loadDefaultSketch(container, curtain, leftCurtain, rightCurtain, loadingPercentage);
                }
            }, 100);
        };
        
        scriptElem.onerror = function() {
            // if sketch script fails to load, use default sketch
            console.warn(`failed to load p5 sketch: ${sketchPath}. using default sketch.`);
            loadingComplete = true;
            loadingProgress = 100;
            loadingPercentage.textContent = '100%';
            
            loadDefaultSketch(container, curtain, leftCurtain, rightCurtain, loadingPercentage);
        };
        
        document.head.appendChild(scriptElem);
        
        // fallback in case script never loads within 5 seconds
        // TODO: indicate failed state
        setTimeout(() => {
            if (!loadingComplete) {
                loadingComplete = true;
                loadingProgress = 100;
                loadingPercentage.textContent = '100%';
                
                setTimeout(() => {
                    loadingPercentage.classList.add('hidden');
                    leftCurtain.classList.add('open');
                    rightCurtain.classList.add('open');
                    
                    setTimeout(() => {
                        curtain.style.display = 'none';
                    }, 1200);
                    
                    loadDefaultSketch(container, curtain, leftCurtain, rightCurtain, loadingPercentage);
                }, 500);
            }
        }, 5000);
    }
    
    // default p5 sketch with curtain animation
    function loadDefaultSketch(container, curtain, leftCurtain, rightCurtain, loadingPercentage) {
        // create default p5 sketch
        const sketch = new p5(function(p) {
            // setup function
            p.setup = function() {
                const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
                canvas.parent(container.querySelector('.canvas-wrapper'));
                p.background(20);
                p.noFill();
                p.stroke(255);
                p.strokeWeight(2);
            };
            
            p.draw = function() {
                p.background(20, 10);
                
                // TODO: better use this as a fallback sketch with dvd like slider bumping saying something went wrong
                p.translate(p.width/2, p.height/2);
                
                const time = p.millis() * 0.001;
                const circles = 12;
                
                for (let i = 0; i < circles; i++) {
                    p.push();
                    p.rotate(p.TWO_PI * i / circles + time * 0.2);
                    
                    const size = p.map(Math.sin(time + i), -1, 1, 50, 200);
                    const offset = p.map(Math.cos(time * 0.5 + i), -1, 1, 0, 200);
                    
                    p.stroke(255, 
                            100 + Math.sin(time + i * 0.2) * 155, 
                            100 + Math.cos(time + i * 0.5) * 155, 
                            150);
                    
                    p.ellipse(offset, 0, size, size);
                    p.pop();
                }
            };
            
            // handle window resize
            p.windowResized = function() {
                p.resizeCanvas(container.clientWidth, container.clientHeight);
                p.background(20);
            };
        });
        
        // store sketch instance for later cleanup
        container.sketchInstance = sketch;
        
        // open curtains animation
        setTimeout(() => {
            loadingPercentage.classList.add('hidden');
            leftCurtain.classList.add('open');
            rightCurtain.classList.add('open');
            
            setTimeout(() => {
                curtain.style.display = 'none';
            }, 1200);
        }, 500);
    }
    
    // keyboard navigation
    document.addEventListener('keydown', function(event) {
        // find the currently visible slide
        const currentSlide = findCurrentVisibleSlide();
        if (!currentSlide) return;
        
        const currentProject = currentSlide.closest('.slide-project-wrapper');
        
        if (event.key === 'ArrowDown' || event.key === ' ' || event.key === 'PageDown') {
            event.preventDefault();
            
            // find next slide or project
            const nextSlide = currentSlide.nextElementSibling;
            if (nextSlide && nextSlide.classList.contains('a-slide')) {
                nextSlide.scrollIntoView({behavior: 'smooth'});
            } else {
                // go to next project
                const nextProject = currentProject.nextElementSibling;
                if (nextProject && nextProject.classList.contains('slide-project-wrapper')) {
                    nextProject.scrollIntoView({behavior: 'smooth'});
                }
            }
        } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
            event.preventDefault();
            
            // find previous slide or project
            const prevSlide = currentSlide.previousElementSibling;
            if (prevSlide && prevSlide.classList.contains('a-slide')) {
                prevSlide.scrollIntoView({behavior: 'smooth'});
            } else {
                // go to previous project
                const prevProject = currentProject.previousElementSibling;
                if (prevProject && prevProject.classList.contains('slide-project-wrapper')) {
                    // go to last slide of previous project
                    const prevProjectSlides = prevProject.querySelectorAll('.a-slide');
                    prevProjectSlides[prevProjectSlides.length - 1].scrollIntoView({behavior: 'smooth'});
                }
            }
        }
    });
    
    // helper function to find the most visible slide
    function findCurrentVisibleSlide() {
        let maxVisibility = 0;
        let mostVisibleSlide = null;
        
        aSlides.forEach(slide => {
            const rect = slide.getBoundingClientRect();
            const visibility = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
            
            if (visibility > maxVisibility) {
                maxVisibility = visibility;
                mostVisibleSlide = slide;
            }
        });
        
        return mostVisibleSlide;
    }
    
    // listen for hash changes
    window.addEventListener('hashchange', navigateToHash);
    
    // handle home page redirection
    window.redirectToHomePage = function() {
        window.location.href = '/';
    };
});