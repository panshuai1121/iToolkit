(function() {
    var demoArea = document.getElementById('demo-script');
    var sourceCodeArea = document.createElement('pre');
    sourceCodeArea.innerHTML = '<code class="language-javascript">' + demoArea.innerHTML + '<\/code>';
    if (document.querySelector('.container')) {
        document.querySelector('.container').appendChild(sourceCodeArea)
    }
    else {
        document.body.appendChild(sourceCodeArea);
    }
})();