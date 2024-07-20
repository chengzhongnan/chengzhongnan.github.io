document.addEventListener("DOMContentLoaded", function () {
    fetch(`software.json?t=${Date.now()}`)
        .then(response => response.json())
        .then(data => createDocument(data))
        .catch(error => console.error('Error loading JSON:', error));
});

function createDocument(jsonData) {
    createNavDom(jsonData);
    createSoftwareDom(jsonData);
}

function createNavDom(jsonData) {
    const navList = document.getElementById('nav-list');
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const categoryType = urlParams.get('category');
    jsonData.schema.forEach(category => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `${window.location.pathname}?category=${category.type}`;
        a.textContent = category.name;

        if (category.type === categoryType) {
            a.classList.add('active');
        }

        li.appendChild(a);
        navList.appendChild(li);
    });
}

function createSoftwareDom(jsonData) {
    // 根据showIndex排序软件
    jsonData.softwares.sort((a, b) => b.showIndex - a.showIndex);

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const category = urlParams.get('category');
    let categoryIndex = -1;
    if (category !== null && jsonData.schema.find(x => x.type == category) !== null) {
        categoryIndex = jsonData.schema.findIndex(x => x.type == category);
    }

    const softwareContainer = document.getElementById('software-container');
    jsonData.softwares.forEach(software => {
        if (categoryIndex !== -1 && software.type !== category) return;
        const softwareCard = document.createElement('div');
        softwareCard.className = 'software-card';

        const imgContainer = document.createElement('div');
        imgContainer.className = 'img-container';
        const img = document.createElement('img');
        img.src = software.image;
        img.alt = software.name;
        imgContainer.appendChild(img);

        const cardContent = document.createElement('div');
        cardContent.className = 'card-content';

        const title = document.createElement('h2');
        title.textContent = software.name;

        // const desc = document.createElement('p');
        // desc.textContent = software.desc;

        const info = document.createElement('p');
        info.textContent = software.info;

        const downloadLink = document.createElement('a');
        downloadLink.href = software.downloadUrl;
        downloadLink.textContent = '下载';

        cardContent.appendChild(title);
        // cardContent.appendChild(desc);
        cardContent.appendChild(info);
        cardContent.appendChild(downloadLink);

        softwareCard.appendChild(imgContainer);
        softwareCard.appendChild(cardContent);

        softwareContainer.appendChild(softwareCard);
    });
}