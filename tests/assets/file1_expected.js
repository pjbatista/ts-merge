'use strict';
var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }
        function rejected(value) {
            try {
                step(generator['throw'](value));
            } catch (e) {
                reject(e);
            }
        }
        function step(result) {
            result.done ? resolve(result.value) : new P(function (resolve) {
                resolve(result.value);
            }).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = this && this.__generator || function (thisArg, body) {
    var _ = {
            label: 0,
            sent: function () {
                if (t[0] & 1)
                    throw t[1];
                return t[1];
            },
            trys: [],
            ops: []
        }, f, y, t, g;
    return g = {
        next: verb(0),
        'throw': verb(1),
        'return': verb(2)
    }, typeof Symbol === 'function' && (g[Symbol.iterator] = function () {
        return this;
    }), g;
    function verb(n) {
        return function (v) {
            return step([
                n,
                v
            ]);
        };
    }
    function step(op) {
        if (f)
            throw new TypeError('Generator is already executing.');
        while (_)
            try {
                if (f = 1, y && (t = y[op[0] & 2 ? 'return' : op[0] ? 'throw' : 'next']) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [
                        0,
                        t.value
                    ];
                switch (op[0]) {
                case 0:
                case 1:
                    t = op;
                    break;
                case 4:
                    _.label++;
                    return {
                        value: op[1],
                        done: false
                    };
                case 5:
                    _.label++;
                    y = op[1];
                    op = [0];
                    continue;
                case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                        _ = 0;
                        continue;
                    }
                    if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                        _.label = op[1];
                        break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                    }
                    if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                    }
                    if (t[2])
                        _.ops.pop();
                    _.trys.pop();
                    continue;
                }
                op = body.call(thisArg, _);
            } catch (e) {
                op = [
                    6,
                    e
                ];
                y = 0;
            } finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var om;
(function (om) {
    /**
     * Contains all states appliable to a neural network while it's training.
     */
    var TrainingState;
    (function (TrainingState) {
        /** When the training hasn't started (0% progress). */
        TrainingState[TrainingState['NotInitialized'] = 0] = 'NotInitialized';
        /** When the training's started and has progressed less than 25%. */
        TrainingState[TrainingState['Initialized'] = 1] = 'Initialized';
        /** When the training's started and has progressed less than 50%. */
        TrainingState[TrainingState['QuarterPast'] = 2] = 'QuarterPast';
        /** When the training's started and has progressed less than 75%. */
        TrainingState[TrainingState['Progressing'] = 3] = 'Progressing';
        /** When the training's started and has progressed more than 75%. */
        TrainingState[TrainingState['QuarterShort'] = 4] = 'QuarterShort';
        /** When the training's completed (all epochs calculated - 100% progress). */
        TrainingState[TrainingState['Completed'] = 5] = 'Completed';
    }(TrainingState = om.TrainingState || (om.TrainingState = {})));
    var data;
    (function (data) {
        /**
         * A static utility class that converts multiple types of data into their binary representation,
         * i.e. a number or array of numbers that can be given to neural networks.
         */
        var BinaryConverter = function () {
            function BinaryConverter() {
            }
            /**
             * Converts the given string to a numeric character code array.
             *
             * @param value
             *   A string to be converted to its binary form.
             */
            BinaryConverter.fromString = function (value) {
                var result = [];
                for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
                    var char = value_1[_i];
                    result.push(char.charCodeAt(0));
                }
                return result;
            };
            /**
             * Converts a numeric character code array to a string.
             *
             * @param value
             *   A number array containing the character code values of the resulting string.
             */
            BinaryConverter.toString = function (value) {
                return String.fromCharCode.apply(null, value);
            };
            return BinaryConverter;
        }();
        data.BinaryConverter = BinaryConverter;
        /**
         * Represents objects that create and retrieve singleton instances for its registered classes.
         *
         * **Important: ** The storage scope is delimited by the object itself, thus multiple singleton
         * containers will store different instances for a class.
         */
        var SingletonContainer = function () {
            function SingletonContainer() {
                this._dictionary = {};
            }
            /**
             * Checks whether the container has the specified type registered or not.
             *
             * @param type
             *   A reference to the class/constructable member to be checked.
             * @typeparam T
             *   Type of object to be checked.
             */
            SingletonContainer.prototype.contains = function (type) {
                var key = this._getKey(type);
                return key in this._dictionary;
            };
            /**
             * Gets the singleton instance of a registered class.
             *
             * @param type
             *   A reference to the class/constructable member to be obtained.
             * @throws ReferenceError
             *   when the class is not registered to the container.
             * @typeparam T
             *   Type of object to be obtained.
             */
            SingletonContainer.prototype.get = function (type) {
                var key = this._getKey(type);
                if (!(key in this._dictionary)) {
                    throw new Error('Class not registered to the singleton container.');
                }
                return this._dictionary[key];
            };
            /**
             * Registers a new class to the container and creates its unique instance.
             *
             * @param type
             *   A reference to the class/constructable member to be registered.
             * @param errorIfRegistered
             *   If true and the class already exists, an error will be thrown; no errors are thrown
             *   otherwise.
             * @throws ReferenceError
             *   when the class is already registered to the container.
             * @typeparam T
             *   Type of object to be registered.
             */
            SingletonContainer.prototype.register = function (type, errorIfRegistered) {
                if (errorIfRegistered === void 0) {
                    errorIfRegistered = false;
                }
                var key = this._getKey(type);
                if (!(key in this._dictionary)) {
                    var instance = new type();
                    this._dictionary[key] = instance;
                    return;
                }
                if (errorIfRegistered) {
                    throw new ReferenceError('Singleton class already registered.');
                }
            };
            SingletonContainer.prototype._getKey = function (type) {
                return JSON.stringify(type);
            };
            return SingletonContainer;
        }();
        data.SingletonContainer = SingletonContainer;
    }(data = om.data || (om.data = {})));
    var mlp;
    (function (mlp) {
        /**
         * Default learning rate value applied to perceptron neural networks.
         */
        mlp.DEFAULT_MOMENTUM = 0.8;
        /**
         * An abstract class that contains the implementations for common perceptron configuration
         * properties and abstractions for actual neural code.
         *
         * @example Teaching the perceptron how to perform a logical XOR:
         *
         * ```javascript
         * // 2 inputs, 1 output, and 2 hidden layers (with 5 and 3 nodes)
         * var nn = new om.mlp.MultiLayerPerceptron(2, 1, 5, 3);
         *
         * // Set array = [x1, x2, x1 ^ x2];
         * nn.train([
         *     [0, 0, -1],
         *     [0, 1, 1],
         *     [1, 0, 1],
         *     [1, 1, -1]
         * ]);
         *
         * console.log(nn.execute(1, 0)); // 0.99653000121
         * console.log(nn.execute(0, 0)); // -0.99374607104
         *
         * // Sets the output data transformer to round the numbers
         * nn.addDataTransformer(nn.outputLayer, om.DataTransformer.round());
         *
         * console.log(nn.execute(1, 1)); // 0
         * console.log(nn.execute(0, 1)); // 1
         * ```
         */
        var MultiLayerPerceptron = function () {
            function MultiLayerPerceptron() {
                this._momentum = mlp.DEFAULT_MOMENTUM;
                this._state = om.TrainingState.NotInitialized;
            }
            Object.defineProperty(MultiLayerPerceptron.prototype, 'learningRate', {
                /**
                 * Gets/sets the learning rate for the perceptron, a number that determines the speed of
                 * the linear correction of the network weights.
                 */
                get: function () {
                    return this._momentum;
                },
                enumerable: true,
                configurable: true
            });
            MultiLayerPerceptron.prototype.asyncExecute = function (callback) {
                var input = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    input[_i - 1] = arguments[_i];
                }
                return __awaiter(this, void 0, void 0, function () {
                    var result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                        case 0:
                            return [
                                4    /*yield*/,
                                this._createExecutePromise(input)
                            ];
                        case 1:
                            result = _a.sent();
                            callback(result);
                            return [2    /*return*/];
                        }
                    });
                });
            };
            MultiLayerPerceptron.prototype.asyncTrain = function (callback) {
                var dataSet = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    dataSet[_i - 1] = arguments[_i];
                }
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                        case 0:
                            if (!(this._state !== om.TrainingState.Completed))
                                return [
                                    3    /*break*/,
                                    2
                                ];
                            return [
                                4    /*yield*/,
                                this._createTrainingPromise(dataSet)
                            ];
                        case 1:
                            _a.sent();
                            callback(this._state);
                            return [
                                3    /*break*/,
                                0
                            ];
                        case 2:
                            return [2    /*return*/];
                        }
                    });
                });
            };
            MultiLayerPerceptron.prototype.execute = function () {
                var input = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    input[_i] = arguments[_i];
                }
                console.log(input);
                throw new Error('Not implemented');
            };
            MultiLayerPerceptron.prototype.train = function () {
                var dataSet = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    dataSet[_i] = arguments[_i];
                }
                console.log(dataSet);
                throw new Error('Not implemented');
            };
            MultiLayerPerceptron.prototype._createExecutePromise = function (input) {
                var _this = this;
                return new Promise(function (resolve) {
                    var result = _this.execute.apply(_this, input);
                    resolve(result);
                });
            };
            MultiLayerPerceptron.prototype._createTrainingPromise = function (dataSet) {
                var _this = this;
                return new Promise(function (resolve) {
                    _this.train.apply(_this, dataSet);
                    resolve();
                });
            };
            return MultiLayerPerceptron;
        }();
        mlp.MultiLayerPerceptron = MultiLayerPerceptron;
    }(mlp = om.mlp || (om.mlp = {})));
}(om || (om = {})));
//# sourceMappingURL=file1_raw.merged.js.map