'use strict';

const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const formats = require('./formats');
const mkdirIfNeccesary = require('./mkdir-if-necessary');
const outputDirectory = require('./output-directory');
const mapInstrumentToSamples = require('./map-instrument-to-samples');
const formatSample = require('./format-sample');
const renameSampleAsHash = require('./rename-sample-as-hash');
const mapSamplesToInstrumentIndex = require('./map-samples-to-instrument-index');
const instrumentSourceFile = require('../../src/index.json');

const writeFile = promisify(fs.writeFile);

const instrumentNames = Reflect.ownKeys(instrumentSourceFile);
const outputDirnames = instrumentNames.reduce(
  (allOutputDirnames, instrumentName) =>
    allOutputDirnames.concat(
      formats.map(([extension]) =>
        path.join(outputDirectory, instrumentName, extension)
      )
    ),
  []
);

const samplesToProcess = instrumentNames
  .map(instrumentName =>
    mapInstrumentToSamples(instrumentName, instrumentSourceFile[instrumentName])
  )
  .reduce(
    (samples, instrumentSamples) => samples.concat(instrumentSamples),
    []
  );

Promise.all(outputDirnames.map(dirname => mkdirIfNeccesary(dirname)))
  .then(() =>
    Promise.all(
      samplesToProcess.reduce(
        (promises, sample) => promises.concat(formatSample(sample)),
        []
      )
    )
  )
  .then(formattedSamples =>
    Promise.all(formattedSamples.map(sample => renameSampleAsHash(sample)))
  )
  .then(renamedSamples => {
    const instrumentIndex = mapSamplesToInstrumentIndex(renamedSamples);
    return writeFile(
      path.join(outputDirectory, 'index.json'),
      JSON.stringify(instrumentIndex, null).replace(/\\\\/g, `/`),
      'utf8'
    );
  });
