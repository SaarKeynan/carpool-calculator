/**
 * Algorithm to calculate carpool routes.
 * A reduction of MTSP (Multiple Travelling Salesman Problem), where the salesmen start in different locations, and have passenger capacities.
 * The algorithm used is based on the one detailed in this paper:
 * https://www.researchgate.net/publication/236340854_A_new_crossover_approach_for_solving_the_multiple_travelling_salesmen_problem_using_genetic_algorithms
 * 
 * Written by Saar Keynan and Omer Shoshani
 */
const MUTATION_POSSIBILITY = 0.7 // The precentage for the offspring to mutate
const POPULATION_AMT = 80 // The total amount of chromosomes in each generation
const SELECTION_AMT = 15 // The amount of surviving chromosomes each generation
const GENERATION_AMT = 200 // The amount of times the selection, crossover, and mutation are performed

let dm = []                 // The distance matrix from each point to each point on the map
let driverLocations = []    // The index of each driver(salesmen)
let driverAmt;              // The amount of drivers
let driverLimits = []       // The max amount of passengers each driver has.
let goal;                   // The meeting point for all drivers at the end of their paths


/**
 * A function that swaps two elements in an array
 * @param {int[]} arr 
 * @param {int} p1 
 * @param {*=int} p2 
 */
function swap(arr, p1, p2) {
    let tmp = arr[p1]
    arr[p1] = arr[p2]
    arr[p2] = tmp 
}

/**
 * A funcion that deep copies an array
 * @param {int[]} arr 
 * @returns int[]
 */
function copy(arr) {
    res = []
    for(let i = 0; i < arr.length; i++) {
        res.push(arr[i])
    }
    return res
}

/**
 * 
 * @param {*} arr 
 * @returns 
 */
function shuffle (arr) {
    let res = copy(arr)
    var j;
    for (let i = 0; i < arr.length; i++) {
        j = random(0, res.length);
        swap(res,j, i)
    }
    return res;
}

/**
 * Function for generating random ints between min and max (min inclusive, max not)
 * @param {*} min 
 * @param {*} max 
 * @returns 
 */
function random(min, max) {
    return Math.floor(Math.random()*(max-min))+min
}

function eval(path) {
    let sum = 0
    let length_index = path.length-driverAmt
    let running = 0
    for (let driver = 0; driver < driverAmt; driver++) {
        if (path[length_index+driver] == 0) {
            sum += dm[drivers[driver]][goal]
            continue
        }

        let i = running;
        sum += dm[drivers[driver]][path[i]]
        for (; i < path[length_index+driver] + running-1; i++) {
            try {
                sum += dm[path[i]][path[i + 1]]
            }
            catch{
                console.log("path: " + path + " i: " + i);
                throw new Exception()
            }
        }
        running = i+1
        try {
            sum += dm[path[i]][goal]
        }
        catch{
            console.log("path: " + path + " i: " + i);
            throw new Exception()
        }
    }
    return sum
}

function compareEval(a, b) {
    return eval(a) - eval(b)
}

/**
 * Initializes random start values, matching the constraints.
 * @param {*} nodeAmt - Amount of drivers, passengers, and the goal.
 * @returns - Initial population
 */
function initStart(nodeAmt) {
    let population = new Array(POPULATION_AMT)
    let base = []
    for(let i = 0; i < nodeAmt; i++) {
        if(drivers.includes(i) || goal == i) {
            continue
        }
        base.push(i)
    }

    for(i = 0; i < POPULATION_AMT; i++) {
        let tmp = shuffle(base)
        let tmpSize = nodeAmt-driverAmt-1
        let lengths = []
        for(let j = 0; j < driverAmt-1; j++) {
            let amt = random(0, Math.min(tmpSize, driverLimits[j]+1))
            lengths.push(amt)
            tmpSize -= amt
        }
        lengths.push(tmpSize)
        redistributeLengths(lengths)
        tmp = tmp.concat(lengths)
        population[i] = tmp
    }
    return population
}

/**
 * The selection function, returns SELECTION_AMT of the top routes in this generation.
 * Also does the crossover and mutation steps.
 * @param {*} population - Current population
 * @returns - New population
 */
function mtspSelection(population) {
    population = population.sort(compareEval)
    new_population = new Array(POPULATION_AMT)
    let i = 0;
    for(; i < SELECTION_AMT; i++) {
        new_population[i] = population[i]
    }

    
    for(let p1 = 0; p1 < SELECTION_AMT && i < POPULATION_AMT; p1++) {
        for(let p2 = p1+1; p2 < SELECTION_AMT && i < POPULATION_AMT; p2++) {
            tmp = mtspCrossover(new_population[p1], new_population[p2])
            if(Math.random() < MUTATION_POSSIBILITY)
                mtspMutation(tmp)

            new_population[i] = tmp 
            i++
         }
    }
    return new_population
}

/**
 * Generates indexes for the subarrays in the TCX Crossover algorithm.
 * @param {*} mom - Parent to generate the points from (mom) 
 * @returns - Returns list of arrays of size 2, each having the start and end points.
 */
function genMomPoints(mom) {
    let slices = []
    let point1, point2, running = 0
    for(let i = mom.length-driverAmt; i < mom.length; i++) {
        point2 = random(running, mom[i]+running)
        point1 = random(running, point2)
        slices.push([point1, point2])
        running += mom[i]
    }
    return slices
}

/**
 * Executes a swap mutation on a child chromosome
 * @param {*} child 
 */
function mtspMutation(child) {
    firstP1 = random(0, child.length-driverAmt)
    firstP2 = random(0, child.length-driverAmt)
    swap(child, firstP1, firstP2)
    secondP1 = random(child.length-driverAmt, child.length)
    secondP2 = random(child.length-driverAmt, child.length)
    swap(child, secondP1, secondP2)
}

/**
 * Creates array of the selected nodes for all drivers
 * @param {*} mom - Parent to get the combined array from.
 * @param {*} momPoints - Array of start, end indexes for each drivers route.
 * @returns 
 */
function getSelectedArr(mom, momPoints) {
    arr = []
    for(let i = 0; i < driverAmt; i++) {
        arr = arr.concat(mom.slice(momPoints[i][0], momPoints[i][1]+1))
    }
    return arr
}

/**
 * The TCX Crossover algorithm as detailed in https://www.researchgate.net/publication/236340854_A_new_crossover_approach_for_solving_the_multiple_travelling_salesmen_problem_using_genetic_algorithms
 * @param {*} mom - As detailed in the article
 * @param {*} dad - As detailed in the article
 * @returns - Child generated from the crossover
 */
function mtspCrossover(mom, dad) {
    let child = []
    let selectedPoints = genMomPoints(mom)
    let selectedArr = getSelectedArr(mom, selectedPoints)
    let unselected = []
    let i = 0;
    for(; i < dad.length-driverAmt; i++) {
        if(!selectedArr.includes(dad[i])) {
            unselected.push(dad[i])   
        }
    }

    let lengths = []
    let unselectedAmt = unselected.length
    let running = 0
    for(i = 0; i < driverAmt-1; i++) {
        child = child.concat(mom.slice(selectedPoints[i][0], selectedPoints[i][1]+1))
        let momAmt = selectedPoints[i][1]-selectedPoints[i][0]+1
        let dadAmt = random(0, Math.min(unselectedAmt, driverLimits[i]-momAmt+1))
        child = child.concat(unselected.slice(running, dadAmt+running))
        running += dadAmt
        unselectedAmt -= dadAmt
        lengths.push(dadAmt+momAmt)
    }
    child = child.concat(mom.slice(selectedPoints[i][0], selectedPoints[i][1]+1))
    child = child.concat(unselected.slice(running, unselected.length))
    lengths.push(selectedPoints[i][1]-selectedPoints[i][0] + unselectedAmt+1)
    redistributeLengths(lengths)
    child = child.concat(lengths)
    return child
}

function redistributeLengths(lengths) {
    let overbooked = lengths.length-1
    let curr = 0
    while(driverLimits[overbooked] < lengths[overbooked]) {
        if (lengths[curr] < driverLimits[curr]) {
            lengths[curr]++
            lengths[overbooked]--
        }
        curr++
        curr = curr % (lengths.length-1)
    }
}

/**
 * Runs the simulation
 * @param {*} dist_matrix - The matrix of distances between each city 
 * @returns - History array of best in each generation.
 */
function runSimulation(dist_matrix, _drivers, _limits, _goal) {
    dm = dist_matrix
    drivers = _drivers
    driverLimits = _limits
    goal = _goal
    driverAmt = _drivers.length
    
    population = initStart(dm.length);
    h = new Array(); // Fastest path progression. The final result is population[0]
    for(let i = 0; i < GENERATION_AMT; i++) {
       population = mtspSelection(population)
       h.push(population[0])
    } 
    return h
}