declare namespace om {
    /**
     * A type definition that represents callback functions for asynchronous neural network
     * processings feedback.
     *
     * @typeparam
     *   The type of output expressed by the neural network.
     * @param result
     *   The processing result; the contents of the neural network output layer.
     */
    type ExecuteCallback<T> = (result: T) => void;
    /**
     * A type definition that represents callback functions for asynchronous neural network
     * trainings feedback. Each state change causes a callback invoke, until the network is fully
     * trained (state = Completed).
     *
     * @typeparam
     *   The type of output expressed by the neural network.
     * @param state
     *   Value representing the current state of the neural network training.
     */
    type TrainingCallback = (state: TrainingState) => void;
    /**
     * Representation of neural network objects that are capable of execute and train
     * asynchronously.
     *
     * @typeparam TOut
     *   The type of output expressed by the neural network. It can be a numeric value that
     *   represents a dimensional reduction, a string in natural language processings, a numeric
     *   matrix with bitmap data, etc.
     */
    interface AsyncNeuralNetwork<TOut> extends NeuralNetwork<TOut> {
        /**
         * Runs the given input through the neurons of the neural network, asynchronously. The
         * contents of the output will only be available to the callback.
         *
         * **Implementations should declare the method as "async".**
         *
         * @param callback
         *   A callback function to be called only when all the processing is complete.
         * @param input
         *   An arbirtrary argument list expected by the neural network object, containing
         *   the input values to be run through its nodes.
         */
        asyncExecute(callback: ExecuteCallback<TOut>, ...input: any[]): Promise<void>;
        /**
         * Trains the neural network with a given data set, performing the necessary weight, bias,
         * threshold, curve, and/or offset corrections, asynchronously.
         *
         * **Implementations should declare the method as "async".**
         *
         * @param callback
         *   A callback function to be called only when all the training is complete.
         * @param dataSet
         *   An arbitrary set of elements, each one containing both the input and expected output
         *   values.
         */
        asyncTrain(callback: TrainingCallback, ...dataSet: any[]): Promise<void>;
    }
}
declare namespace om {
    /**
     * **This interface is only declared, nothing is actually exported!**
     *
     * Represents native objects with an empty constructor and prototype.
     *
     * @typeparam T
     *   Type of object created by the default constructor.
     */
    interface Constructable<T> {
        /**
         * The object's own prototype definition, a structure created by JavaScript internal engine.
         */
        readonly prototype: T;
        /**
         * Empty, default constructor representation. Signalizes that the constructable object
         * reference can be initialized via ```new T()```.
         */
        new (): T;
    }
}
declare namespace om {
    /**
     * Primitive representation of a neural network. This interface exposes the main functionality
     * of neural network objects: to learn something through training and to execute what it's
     * learned, presenting the results through an output layer.
     *
     * @typeparam TOut
     *   The type of output expressed by the neural network. It can be a numeric value that
     *   represents a dimensional reduction, a string in natural language processings, a numeric
     *   matrix with bitmap data, etc.
     */
    interface NeuralNetwork<TOut> {
        /**
         * Runs the given input through the neurons of the neural network and returns the processing
         * results of the output layer.
         *
         * @param input
         *   An arbirtrary argument list expected by the neural network object, containing
         *   the input values to be run through its nodes.
         */
        execute(...input: any[]): TOut;
        /**
         * Trains the neural network with a given data set, performing the necessary weight, bias,
         * threshold, curve, and/or offset corrections.
         *
         * @param dataSet
         *   An arbitrary set of elements, each one containing both the input and expected output
         *   values.
         */
        train(...dataSet: any[]): void;
    }
}
declare namespace om {
    /**
     * Represents a neural processing entity that has axon-like junctions with another neural
     * entities.
     *
     * These junctions represent information (synapsis) going forward in the neural system, as
     * neural nodes **do not** track where the information is coming from (no backwards linking).
     */
    interface NeuralNode extends NeuralProcessingEntity {
        /**
         * Contains the terminal junctions of the neural entity, which are the neural processing
         * entities that will receive information transmitted by this object.
         */
        junctions: NeuralProcessingEntity[];
    }
}
declare namespace om {
    /**
     * Primitive representation of a neural processing entity (e.g. a neuron or an action potential
     * encapsulation). Contains the programmatic equivalent of the action potential charge and
     * electric thresholds exposed by its properties.
     */
    interface NeuralProcessingEntity {
        /**
         * A number that determines the firing of the action potential inside a neural system. Can
         * be compared to the electric charge threshold of a real-life synapsis.
         */
        threshold: number;
        /**
         * A number that determines the current "charge" of a neural processing entity. Can be
         * compared to the current electric charge of a real-life neuron.
         */
        value: number;
    }
}
declare namespace om {
    /**
     * Contains all states appliable to a neural network while it's training.
     */
    enum TrainingState {
        /** When the training hasn't started (0% progress). */
        NotInitialized = 0,
        /** When the training's started and has progressed less than 25%. */
        Initialized = 1,
        /** When the training's started and has progressed less than 50%. */
        QuarterPast = 2,
        /** When the training's started and has progressed less than 75%. */
        Progressing = 3,
        /** When the training's started and has progressed more than 75%. */
        QuarterShort = 4,
        /** When the training's completed (all epochs calculated - 100% progress). */
        Completed = 5,
    }
}
declare namespace om.data {
    /**
     * A static utility class that converts multiple types of data into their binary representation,
     * i.e. a number or array of numbers that can be given to neural networks.
     */
    class BinaryConverter {
        /**
         * Converts the given string to a numeric character code array.
         *
         * @param value
         *   A string to be converted to its binary form.
         */
        static fromString(value: string): number[];
        /**
         * Converts a numeric character code array to a string.
         *
         * @param value
         *   A number array containing the character code values of the resulting string.
         */
        static toString(value: number[]): string;
        private constructor();
    }
}
declare namespace om.data {
    /**
     * **This interface is only declared, nothing is actually exported!**
     *
     * Represents containers that store information based on a string hash; mimics the behavior of
     * prototyped JS classes (and by inference, TypeScript classes as well).
     *
     * @typeparam T
     *   Type of object stored by the dictionary.
     */
    interface Dictionary<T> {
        /**
         * Gets/sets the object located at the given dictionary key.
         *
         * @param key
         *   A string that uniquely identifies the object in the dictionary.
         */
        [key: string]: T;
    }
}
declare namespace om.data {
    /**
     * Represents objects that create and retrieve singleton instances for its registered classes.
     *
     * **Important: ** The storage scope is delimited by the object itself, thus multiple singleton
     * containers will store different instances for a class.
     */
    class SingletonContainer {
        private _dictionary;
        /**
         * Checks whether the container has the specified type registered or not.
         *
         * @param type
         *   A reference to the class/constructable member to be checked.
         * @typeparam T
         *   Type of object to be checked.
         */
        contains<T>(type: Constructable<T>): boolean;
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
        get<T>(type: Constructable<T>): T;
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
        register<T>(type: Constructable<T>, errorIfRegistered?: boolean): void;
        private _getKey<T>(type);
    }
}
declare namespace om.mlp {
    /**
     * Default learning rate value applied to perceptron neural networks.
     */
    const DEFAULT_MOMENTUM = 0.8;
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
    class MultiLayerPerceptron<TOut> implements AsyncNeuralNetwork<TOut> {
        private _momentum;
        private _state;
        /**
         * Gets/sets the learning rate for the perceptron, a number that determines the speed of
         * the linear correction of the network weights.
         */
        readonly learningRate: number;
        asyncExecute(callback: ExecuteCallback<TOut>, ...input: any[]): Promise<void>;
        asyncTrain(callback: TrainingCallback, ...dataSet: any[]): Promise<void>;
        execute(...input: any[]): TOut;
        train(...dataSet: any[]): void;
        private _createExecutePromise(input);
        private _createTrainingPromise(dataSet);
    }
}
