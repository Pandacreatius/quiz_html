const tray = document.getElementById("tag-tray");
const chips = Array.from(document.querySelectorAll(".tag-chip"));
const slots = Array.from(document.querySelectorAll(".drop-slot, .nested-drop-slot"));
const feedbackList = document.getElementById("feedback-list");
const scoreValue = document.querySelector(".score-value");
const scoreDetail = document.getElementById("score-detail");
const checkButton = document.getElementById("check-button");
const hintButton = document.getElementById("hint-button");
const resetButton = document.getElementById("reset-button");

let draggedChip = null;

const voidTags = ["meta-charset", "meta-viewport"];

const tagExplanations = {
    html: "Es la etiqueta raíz y contiene todo el documento.",
    head: "Guarda la información técnica que el navegador necesita, pero que no se ve en la página.",
    "meta-charset": "Define la codificación para que tildes, ñ y símbolos se vean correctamente.",
    "meta-viewport": "Ayuda a que la página se adapte bien a móviles y tablets.",
    title: "Define el texto que aparece en la pestaña del navegador.",
    body: "Contiene todo el contenido visible para el usuario.",
    header: "Se usa para la cabecera o parte superior del sitio o de una sección.",
    nav: "Agrupa los enlaces principales de navegación.",
    main: "Reúne el contenido principal de la página.",
    section: "Sirve para agrupar un bloque temático de contenido.",
    h1: "Es el título principal del documento o de la página.",
    p: "Se usa para escribir párrafos de texto.",
    footer: "Suele incluir el cierre, contacto o información final."
};

function updateChipState(chip, used) {
    chip.classList.toggle("used", used);
}

function clearSlotVisualState(slot) {
    slot.classList.remove("slot-correct");
    slot.classList.remove("slot-wrong");
    const state = slot.querySelector(":scope > .slot-state");
    if (state) {
        state.remove();
    }
}

function getClosingText(tagName) {
    if (tagName === "meta-charset" || tagName === "meta-viewport") {
        return "";
    }

    return "</" + tagName + ">";
}

function removePlacedTag(tagName, slot) {
    const originChip = chips.find(function (item) {
        return item.dataset.tag === tagName;
    });

    if (originChip) {
        tray.appendChild(originChip);
        updateChipState(originChip, false);
    }

    const openTag = slot.querySelector(":scope > .placed-tag-open");
    const closeTag = slot.querySelector(":scope > .placed-tag-close");
    const singleTag = slot.querySelector(":scope > .placed-tag-single");

    if (openTag) {
        openTag.remove();
    }

    if (closeTag) {
        closeTag.remove();
    }

    if (singleTag) {
        singleTag.remove();
    }

    clearSlotVisualState(slot);
}

function createTagButton(text, tagName, type, slot) {
    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = "placed-tag " + type;
    tag.textContent = text;
    tag.dataset.tag = tagName;

    tag.addEventListener("click", function () {
        removePlacedTag(tagName, slot);
    });

    return tag;
}

function createPlacedTagParts(chip, slot) {
    const tagName = chip.dataset.tag;

    if (voidTags.includes(tagName)) {
        return {
            single: createTagButton(chip.textContent, tagName, "placed-tag-single", slot)
        };
    }

    return {
        open: createTagButton(chip.textContent, tagName, "placed-tag-open", slot),
        close: createTagButton(getClosingText(tagName), tagName, "placed-tag-close", slot)
    };
}

function insertPlacedTags(slot, tagParts) {
    const firstNestedSlot = slot.querySelector(":scope > .nested-drop-slot");
    const firstState = slot.querySelector(":scope > .slot-state");
    const closingAnchor = slot.querySelector(":scope > .slot-state");

    if (tagParts.single) {
        if (firstState) {
            slot.insertBefore(tagParts.single, firstState);
            return;
        }

        if (firstNestedSlot) {
            slot.insertBefore(tagParts.single, firstNestedSlot);
            return;
        }

        slot.appendChild(tagParts.single);
        return;
    }

    if (firstState) {
        slot.insertBefore(tagParts.open, firstState);
    } else if (firstNestedSlot) {
        slot.insertBefore(tagParts.open, firstNestedSlot);
    } else {
        slot.appendChild(tagParts.open);
    }

    if (closingAnchor) {
        slot.insertBefore(tagParts.close, closingAnchor);
    } else {
        slot.appendChild(tagParts.close);
    }
}

function placeChipInSlot(chip, slot) {
    const existingTag = slot.querySelector(":scope > .placed-tag-open, :scope > .placed-tag-single");

    if (existingTag) {
        removePlacedTag(existingTag.dataset.tag, slot);
    }

    insertPlacedTags(slot, createPlacedTagParts(chip, slot));
    updateChipState(chip, true);
    clearSlotVisualState(slot);
}

chips.forEach(function (chip) {
    chip.addEventListener("dragstart", function () {
        draggedChip = chip;
        chip.classList.add("dragging");
    });

    chip.addEventListener("dragend", function () {
        chip.classList.remove("dragging");
    });
});

slots.forEach(function (slot) {
    slot.addEventListener("dragover", function (event) {
        event.preventDefault();
        event.stopPropagation();
        slot.classList.add("drag-over");
    });

    slot.addEventListener("dragleave", function (event) {
        event.stopPropagation();
        slot.classList.remove("drag-over");
    });

    slot.addEventListener("drop", function (event) {
        event.preventDefault();
        event.stopPropagation();
        slot.classList.remove("drag-over");

        if (!draggedChip) {
            return;
        }

        placeChipInSlot(draggedChip, slot);
        draggedChip = null;
    });
});

function slotMessage(slot, ok, text) {
    const state = document.createElement("p");
    state.className = "slot-state";
    state.textContent = text;

    const firstNestedSlot = slot.querySelector(":scope > .nested-drop-slot");

    if (firstNestedSlot) {
        slot.insertBefore(state, firstNestedSlot);
    } else {
        slot.appendChild(state);
    }

    slot.classList.add(ok ? "slot-correct" : "slot-wrong");
}

function buildSuggestions() {
    const suggestions = [];

    slots.forEach(function (slot) {
        const placedTag = slot.querySelector(":scope > .placed-tag-open, :scope > .placed-tag-single");
        const expected = slot.dataset.accept;
        const label = slot.querySelector(".slot-label").textContent;

        if (!placedTag) {
            suggestions.push("Falta una etiqueta en: " + label + ".");
            return;
        }

        const actual = placedTag.dataset.tag;

        if (actual !== expected) {
            suggestions.push("En \"" + label + "\" conviene usar <" + expected + "> en lugar de <" + actual + ">.");
            suggestions.push("Pista: <" + expected + "> " + tagExplanations[expected]);
        }
    });

    const wrongExtras = chips.filter(function (chip) {
        return !chip.classList.contains("used") && (chip.dataset.tag === "div" || chip.dataset.tag === "span");
    });

    if (wrongExtras.length === 2) {
        suggestions.push("Recuerda que <div> y <span> no forman parte de la estructura principal que se pide en este ejercicio.");
    }

    if (suggestions.length === 0) {
        suggestions.push("Perfecto. La estructura semántica está bien montada.");
    }

    return suggestions;
}

checkButton.addEventListener("click", function () {
    let correctCount = 0;
    let missingCount = 0;
    let wrongCount = 0;

    slots.forEach(function (slot) {
        clearSlotVisualState(slot);

        const placedTag = slot.querySelector(":scope > .placed-tag-open, :scope > .placed-tag-single");
        const expected = slot.dataset.accept;

        if (!placedTag) {
            missingCount += 1;
            slotMessage(slot, false, "Falta una etiqueta. " + tagExplanations[expected]);
            return;
        }

        if (placedTag.dataset.tag === expected) {
            correctCount += 1;
            slotMessage(slot, true, "Correcto: aquí encaja <" + expected + ">. " + tagExplanations[expected]);
            return;
        }

        wrongCount += 1;
        slotMessage(slot, false, "Aquí no encaja <" + placedTag.dataset.tag + ">. La opción correcta es <" + expected + ">. " + tagExplanations[expected]);
    });

    scoreValue.textContent = correctCount + " / " + slots.length + " correctas";
    scoreDetail.textContent = "Has colocado bien " + correctCount + ", te faltan " + missingCount + " y hay " + wrongCount + " en una posición incorrecta.";
    feedbackList.innerHTML = "";

    buildSuggestions().forEach(function (suggestion) {
        const item = document.createElement("li");
        item.textContent = suggestion;
        feedbackList.appendChild(item);
    });
});

hintButton.addEventListener("click", function () {
    const firstProblemSlot = slots.find(function (slot) {
        const placedTag = slot.querySelector(":scope > .placed-tag-open, :scope > .placed-tag-single");
        return !placedTag || placedTag.dataset.tag !== slot.dataset.accept;
    });

    feedbackList.innerHTML = "";

    const item = document.createElement("li");

    if (!firstProblemSlot) {
        item.textContent = "No necesitas más pistas. Ya lo tienes resuelto.";
    } else {
        item.textContent = "Pista: en \"" + firstProblemSlot.querySelector(".slot-label").textContent + "\" debería ir <" + firstProblemSlot.dataset.accept + ">. " + tagExplanations[firstProblemSlot.dataset.accept];
    }

    feedbackList.appendChild(item);
});

resetButton.addEventListener("click", function () {
    slots.forEach(function (slot) {
        const placedTag = slot.querySelector(":scope > .placed-tag-open, :scope > .placed-tag-single");
        if (placedTag) {
            removePlacedTag(placedTag.dataset.tag, slot);
        }

        clearSlotVisualState(slot);
    });

    feedbackList.innerHTML = "<li>Empieza por la etiqueta raíz y después completa &lt;head&gt; y &lt;body&gt;.</li>";
    scoreValue.textContent = "Aún no corregido";
    scoreDetail.textContent = "Coloca las etiquetas y corrige cuando quieras.";
});
