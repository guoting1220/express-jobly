const isSubset = require('./subset');

describe("check isSubset function", function () {
    test("check is subset", function() {
        expect(isSubset([0,1], [0,1,2])).toEqual(true);
        expect(isSubset([0, 1], [0, 1])).toEqual(true);
        expect(isSubset([0, 1], [0, 1, 2])).toEqual(true);
    });

    test("check is not subset", function () {
        expect(isSubset([0, 1], [1, 2])).toEqual(false);
        expect(isSubset([0, 1], [0])).toEqual(false);  
    });
    
    test("check empty array should be subset of any unempty array", function () {
        expect(isSubset([], [1, 2])).toEqual(true);        
    });

    test("check empty array should not have subsets", function () {
        expect(isSubset([0], [])).toEqual(false);
        expect(isSubset([], [])).toEqual(false);
    });
})