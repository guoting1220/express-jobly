// function to check if arr1 is the subset of arr2

function isSubset(arr1, arr2) {
    if (arr2.length === 0) return false;
    if (arr1.length === 0) return true;

    for (let i of arr1) {
        if (arr2.indexOf(i) === -1) return false;
    }

    return true;
}

module.exports = isSubset;