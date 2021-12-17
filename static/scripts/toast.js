'use strict';

const toast = (() => {
    const overlay = $("<div class='toast-overlay'>").appendTo("body")

    const build = (message, timeout) => {
        let content = $("<div class='toast'>");

        let button = $("<button class='close' type='button'>")
                    .append("&times;")
                    .on('click', () => content.remove());

        content.append($("<p class='toast-content'>").text(message))
               .append(button);

        if (timeout) {
            content.fadeOut(timeout);
        }

        return content
    }
    
    return {
        info: (message, timeout) => overlay.append(build(message, timeout).addClass("toast-info")),
        warning: (message, timeout) =>  overlay.append(build(message, timeout).addClass("toast-warning")),
        error: (message, timeout) => overlay.append(build(message, timeout).addClass("toast-error")),
        clear: () => overlay.empty()
    }
})();