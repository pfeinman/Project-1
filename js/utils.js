// random fn
const rand = (min, max) => Math.floor(Math.random() * (max - min)) + min

// random hex
const randomHex = () => {
    const hexVals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'A', 'B', 'C', 'D', 'E', 'F'];
    return hexVals[Math.floor(Math.random() * hexVals.length)]
};
const randomColor = () => {
    const hexVal = ['#'];
    for(let i = 0; i < 6; i++){
        hexVal.push(randomHex())
    }
    return hexVal.join('')
};