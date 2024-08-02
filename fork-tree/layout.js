const CMD_INITIALIZE_LAYOUT = 0;
const CMD_OPTIMIZE_LAYOUT = 1;
const RES_INITIAL_LAYOUT = 0;
const RES_UPDATED_LAYOUT = 1;

function initializeLayout(command) {
    ///
}

function optimizeLayout(command) {
    ///
}

onmessage = function(event) {
    var command = event.data;
    if (command.type == CMD_INITIALIZE_LAYOUT) initializeLayout(command);
    else if (command.type == CMD_OPTIMIZE_LAYOUT) optimizeLayout(command);
};