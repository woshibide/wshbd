const fs = require('fs')
const path = require('path')

const archivePath = path.join(__dirname, '../../content/info/archive.json')
const imageMapPath = path.join(__dirname, '../../content/info/image-map.json')

console.log('Reading JSON files...')

try {
    const archiveData = JSON.parse(fs.readFileSync(archivePath, 'utf8'))
    const imageMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf8'))

    console.log('JSON files read successfully.')

    const templatePath = path.join(__dirname, 'templates/something_template.html')
    let template = fs.readFileSync(templatePath, 'utf8')

    console.log('Template file read successfully.')

    function createProjectSections(projectsList, imageMap) {
        let sectionsHtml = ''

        for (let project of projectsList) {
            let images = imageMap[project.id] || ['/content/misc/non-image.svg']
            let basePath = '/content/images/'
            images = images.map(image => {
                return image.startsWith('/content/images/')
                    ? image
                    : `${basePath}${project.id}/${image}`
            })

            // create project sections
            let sectionHtml = `
            <div class="project-section" id="${project.id}">
                <div class="project-image">
                    <img src="${images[0]}" alt="${project.title}" loading="lazy" data-images='${JSON.stringify(images)}'>
                </div>
                <div class="text-columns">
                    <div id="gallery-info">
                        <a id="brand" href="/archive/${project.id}">${project.brand}</a>
                        <p id="title">${project.title}</p>
                        <p id="date">${project.date}</p>
                    </div>
                    <div class="empty-column"></div>
                    <div class="empty-column"></div>
                    <div id="gallery-counter-container">
                        <p id="gallery-counter">[1/${images.length}]</p>
                    </div>
                </div>
            </div>
            `
            sectionsHtml += sectionHtml
        }

        return sectionsHtml
    }

    console.log('Generating project sections HTML...')
    let projectsList = archiveData.projects
    let projectSectionsHtml = createProjectSections(projectsList, imageMap)

    template = template.replace('<!-- PROJECT_SECTION_PLACEHOLDER -->', projectSectionsHtml)

    const outputPath = path.join(__dirname, '../../something/index.html')
    fs.writeFileSync(outputPath, template, 'utf8')

    console.log('HTML file generated successfully at', outputPath)

} catch (error) {
    console.error('Error during generation:', error.message)
}