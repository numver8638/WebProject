'use strict';

const utils = {
    generateID: () => {
        let buffer = new Uint8Array(16);
        window.crypto.getRandomValues(buffer);

        let str = "";

        for (let b of buffer) {
            str += b < 16 ? ("0" + b.toString(16)) : b.toString(16);
        }

        return str;
    },
    observe: (target, callback) => {
        const io = new IntersectionObserver(([entry], observer) => {
            if (entry.isIntersecting) {
                observer.disconnect();
                callback();
            }
        }, { threshold: 0.1 });

        io.observe(target);
    }
};