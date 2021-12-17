$(() => {
    const closeHandler = (e) => $(e.currentTarget).parents(".modal").removeClass("active");
    const toggleHandler = (e) => {
        let modal = $($(e.currentTarget).data("target-modal"));

        if (modal) {
            let show = !modal.hasClass("active");

            modal.toggleClass("active");

            let target = $(e.currentTarget);
            modal.trigger(show ? "modal.shown" : "modal.hide", [target]);
        }
    };

    // Install default close handler.
    $(".modal .close").on("click", closeHandler);

    // Install default open handler.
    $("[data-toggle='modal']").on("click", toggleHandler);

    const config = { attributes: true, childList: true, subtree: true };
    // MutationObserver for dynamically created nodes
    const mo = new MutationObserver((mutations, observer) => {
        for (let mutation of mutations) {
            mutation.addedNodes.forEach((node) => {
                $(node).find("[data-toggle='modal']").on("click", toggleHandler);
            });
        }
    });

    mo.observe(document.body, {
        subtree: true,
        childList: true,
        attributeFilter: ["data-modal", "data-target-modal"]
    });
});