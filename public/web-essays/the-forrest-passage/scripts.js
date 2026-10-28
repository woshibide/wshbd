/////////////////////////////////////////////////////
// 
//  for each character
//  in visible text 
//  to loop for given time
//  on scroll event
//
/////////////////////////////////////////////////////

// ----- scroll animation -----
var textResetTimeout;
var paragraphs = document.querySelectorAll('p');


// AaEeIiOoUu
// ABCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz
// tionglyabsdmente
// ...::/\\/\\/\\+=*abcdef01XYZ#

var availableChars = "tionglyabsdmente##"; // set of characters to substitute characters with
availableChars = availableChars.split('');

function updateTextString(inputText) {
    var inputChars = inputText.split('');

    inputChars.forEach(function (char, index) {
        if (char != ' ') {
            var charIndex = availableChars.indexOf(char);

            if (charIndex != -1) {
                var nextCharIndex = charIndex + 1;

                if (nextCharIndex >= availableChars.length)
                    nextCharIndex -= 1;

                inputChars[index] = availableChars[nextCharIndex];
            }
        }
    });

    return inputChars.join('');
}

function resetVisibleTexts() {
    paragraphs.forEach(function (paragraph) {
        paragraph.innerText = paragraph.dataset.defaultText;
    });
}

function updateVisibleTexts() {
    paragraphs.forEach(function (paragraph) {
        var rect = paragraph.getBoundingClientRect();
        var isInView = (
            rect.top >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
        );

        if (isInView) {
            paragraph.innerText = updateTextString(paragraph.innerText);
        }
    });

    clearTimeout(textResetTimeout);
    textResetTimeout = setTimeout(resetVisibleTexts, 50);
}


window.addEventListener('scroll', updateVisibleTexts);

// Initialize default text
paragraphs.forEach(function (paragraph) {
    paragraph.dataset.defaultText = paragraph.innerText;
});

// Trigger in view
function checkAndUpdateHeading(element) {
    var rect = element.getBoundingClientRect();
    var isInView = (
        rect.top >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    );

    if (isInView) {
        element.textContent = updateTextString(element.textContent);
        element.classList.add('heading-in-viewport');
    } else {
        element.classList.remove('heading-in-viewport');
    }
}



// Get all <a> elements with href attributes
const links = document.querySelectorAll('a[href]');

// Loop through the elements and set the font size to 6rem
links.forEach(function (link) {
    link.style.fontSize = '6rem';
});


// color everything what is h4 in grayscale loop
window.onload = function () {
    var h4Element = document.querySelector('h4');
    var anchorElements = h4Element.getElementsByTagName('a');
    var totalElements = anchorElements.length;


    for (var i = 0; i < totalElements; i++) {
        var grayscaleValue = Math.floor((i / totalElements) * 255);

        // Calculate the inverted grayscale value
        var invertedGrayscaleValue = 255 - grayscaleValue;

        // Get the current color and background-color values
        var currentColor = window.getComputedStyle(anchorElements[i]).getPropertyValue('color');
        var currentBgColor = window.getComputedStyle(anchorElements[i]).getPropertyValue('background-color');

        // Apply the grayscale effect without overwriting other properties
        anchorElements[i].style.color = 'rgb(' + invertedGrayscaleValue + ',' + invertedGrayscaleValue + ',' + invertedGrayscaleValue + ')';
        anchorElements[i].style.backgroundColor = 'rgb(' + grayscaleValue + ',' + grayscaleValue + ',' + grayscaleValue + ')';

        // Preserve other styles (hover, visited, etc.)
        anchorElements[i].addEventListener('mouseenter', function () {
            this.style.color = currentColor;
            this.style.backgroundColor = currentBgColor;
        });

        anchorElements[i].addEventListener('mouseleave', function () {
            this.style.color = 'rgb(' + invertedGrayscaleValue + ',' + invertedGrayscaleValue + ',' + invertedGrayscaleValue + ')';
            this.style.backgroundColor = 'rgb(' + grayscaleValue + ',' + grayscaleValue + ',' + grayscaleValue + ')';
        });
    }
}


// ----- ui -----

// Get references to the anchor links and the start and end elements
var startLink = document.getElementById('start-link');
var endLink = document.getElementById('end-link');
var startElement = document.getElementById('start');
var endElement = document.getElementById('end');

// Add click event listeners to the anchor links
startLink.addEventListener('click', function (event) {
    event.preventDefault(); // Prevent the default behavior of the link
    startElement.scrollIntoView({ behavior: 'smooth' }); // Scroll to the start element smoothly
});

endLink.addEventListener('click', function (event) {
    event.preventDefault(); // Prevent the default behavior of the link
    endElement.scrollIntoView({ behavior: 'smooth' }); // Scroll to the end element smoothly
});


// Content picker option

document.addEventListener("DOMContentLoaded", function () {
    const innerListItems = document.querySelectorAll("li ul li");
  
    innerListItems.forEach((item) => {
      item.addEventListener("click", function () {
        // Toggle sticky and font size
        if (item.classList.contains("active")) {
          item.classList.remove("active");
        } else {
          item.classList.add("active");
        }
      });
    });
  });
  