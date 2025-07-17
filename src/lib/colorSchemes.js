export const colorSchemes = {
    people: {
        default: [100, 100, 100],
    },
    gender: {
        m: [0, 255, 255],
        f: [255, 20, 255],
        default: [220, 220, 220],
    },
    density: {
        ranges: [
            {
                max: 0.2,
                startColor: [158, 1, 66],
                endColor: [153, 213, 148],
            },
            {
                max: 0.4,
                startColor: [153, 213, 148],
                endColor: [230, 245, 152],
            },
            {
                max: 0.6,
                startColor: [230, 245, 152],
                endColor: [254, 224, 139],
            },
            {
                max: 0.8,
                startColor: [254, 224, 139],
                endColor: [253, 174, 97],
            },
            {
                max: 1.0,
                startColor: [253, 174, 97],
                endColor: [213, 62, 79],
            },
        ],
    },
};