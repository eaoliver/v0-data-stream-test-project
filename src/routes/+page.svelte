<script lang="ts">
  import { FileText, Upload, Beaker } from "lucide-svelte";

  let fileInput: HTMLInputElement;
  let fileName = $state("");
  let average = $state<number | null>(null);
  let recordCount = $state(0);
  let errorMessage = $state("");
  let isProcessing = $state(false);
  let resultValueIndex = $state<number | null>(null);
  let characteristicNameIndex = $state<number | null>(null);
  let isDragging = $state(false);

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    processFile(file);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;

    const file = event.dataTransfer?.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      errorMessage = "Please upload a CSV file";
      return;
    }

    processFile(file);
  }

  async function processFile(file: File) {
    fileName = file.name;
    errorMessage = "";
    average = null;
    recordCount = 0;
    resultValueIndex = null;
    characteristicNameIndex = null;
    isProcessing = true;

    try {
      await processCSVLineByLine(file);
    } catch (error) {
      errorMessage = `Error processing file: ${error}`;
    } finally {
      isProcessing = false;
    }
  }

  async function processCSVLineByLine(file: File) {
    const CHUNK_SIZE = 64 * 1024; // 64KB chunks
    let offset = 0;
    let remainder = "";
    let lineNumber = 0;
    let sum = 0;
    let count = 0;
    let foundResultValueIndex = -1;
    let foundCharacteristicNameIndex = -1;

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const text = await chunk.text();
      const lines = (remainder + text).split("\n");

      // Keep the last incomplete line for the next chunk
      remainder = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        if (lineNumber === 0) {
          // Process header
          const headers = parseCSVLine(line);
          foundResultValueIndex = headers.findIndex((h) => h === "ResultValue");
          foundCharacteristicNameIndex = headers.findIndex(
            (h) => h === "CharacteristicName",
          );

          if (foundResultValueIndex === -1) {
            throw new Error(
              'Column validation failed: Could not find "ResultValue" column in header',
            );
          }

          if (foundCharacteristicNameIndex === -1) {
            throw new Error(
              'Column validation failed: Could not find "CharacteristicName" column in header',
            );
          }

          resultValueIndex = foundResultValueIndex;
          characteristicNameIndex = foundCharacteristicNameIndex;

          console.log(
            "[v0] Found columns - ResultValue:",
            foundResultValueIndex,
            "CharacteristicName:",
            foundCharacteristicNameIndex,
          );
        } else {
          // Process data row
          const row = parseCSVLine(line);

          if (
            row.length <=
            Math.max(foundResultValueIndex, foundCharacteristicNameIndex)
          )
            continue;

          const characteristicName = row[foundCharacteristicNameIndex];
          const resultValueStr = row[foundResultValueIndex];

          if (characteristicName === "Temperature, water") {
            const resultValue = parseFloat(resultValueStr);

            if (!isNaN(resultValue)) {
              sum += resultValue;
              count++;
              console.log(
                "[v0] Line",
                lineNumber,
                "- Temperature:",
                resultValue,
                "| Running count:",
                count,
              );
            }
          }
        }

        lineNumber++;
      }

      offset += CHUNK_SIZE;
    }

    // Process any remaining line
    if (remainder.trim()) {
      const row = parseCSVLine(remainder);

      if (
        row.length >
        Math.max(foundResultValueIndex, foundCharacteristicNameIndex)
      ) {
        const characteristicName = row[foundCharacteristicNameIndex];
        const resultValueStr = row[foundResultValueIndex];

        if (characteristicName === "Temperature, water") {
          const resultValue = parseFloat(resultValueStr);

          if (!isNaN(resultValue)) {
            sum += resultValue;
            count++;
            console.log(
              "[v0] Final line - Temperature:",
              resultValue,
              "| Final count:",
              count,
            );
          }
        }
      }
    }

    if (count === 0) {
      throw new Error('No valid "Temperature, water" records found in the CSV');
    }

    average = sum / count;
    recordCount = count;
    console.log(
      "[v0] Processing complete - Average:",
      average,
      "| Total records:",
      count,
    );
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let currentField = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        result.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }

    result.push(currentField.trim());
    return result;
  }

  function resetUpload() {
    fileName = "";
    average = null;
    recordCount = 0;
    errorMessage = "";
    resultValueIndex = null;
    characteristicNameIndex = null;
    if (fileInput) {
      fileInput.value = "";
    }
  }
</script>

<div
  class="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900"
>
  <div class="container mx-auto px-4 py-12 max-w-4xl">
    <!-- Header -->
    <div class="text-center mb-12">
      <div class="inline-flex items-center justify-center gap-3 mb-4">
        <Beaker class="w-10 h-10 text-blue-400" />
        <h1 class="text-4xl font-bold text-white">
          Water Temperature Analysis
        </h1>
      </div>
      <p class="text-blue-200 text-lg">
        {"CSV Data Processor & Statistical Calculator"}
      </p>
    </div>

    <!-- Main Card -->
    <div
      class="bg-slate-900/80 backdrop-blur-sm border border-blue-800/50 rounded-2xl shadow-2xl overflow-hidden"
    >
      <!-- Upload Section -->
      <div class="p-8 border-b border-blue-800/30">
        <label
          for="csv-upload"
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
          class="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl cursor-pointer transition-all {isDragging
            ? 'border-blue-400 bg-blue-900/40'
            : 'border-blue-600/50 hover:border-blue-500 hover:bg-blue-950/30'}"
        >
          <Upload class="w-16 h-16 text-blue-400 mb-4" />
          <span class="text-blue-200 text-lg font-medium mb-2">
            {fileName || "Select CSV File"}
          </span>
          <span class="text-blue-400/70 text-sm">
            Click to browse or drag and drop
          </span>
        </label>
        <input
          bind:this={fileInput}
          id="csv-upload"
          type="file"
          accept=".csv"
          onchange={handleFileSelect}
          class="hidden"
        />

        {#if fileName && !isProcessing}
          <div
            class="mt-4 flex items-center justify-between bg-blue-950/30 rounded-lg p-4"
          >
            <div class="flex items-center gap-3">
              <FileText class="w-5 h-5 text-blue-400" />
              <span class="text-blue-200 font-mono text-sm">{fileName}</span>
            </div>
            <button
              onclick={resetUpload}
              class="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        {/if}

        {#if isProcessing}
          <div class="mt-4 text-center text-blue-300 animate-pulse">
            Processing CSV data...
          </div>
        {/if}
      </div>

      <!-- Results Section -->
      {#if errorMessage}
        <div class="p-8 bg-red-950/30 border-t border-red-800/30">
          <div class="flex items-start gap-3">
            <svg
              class="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 class="text-red-300 font-semibold mb-1">Error</h3>
              <p class="text-red-200/80 text-sm">{errorMessage}</p>
            </div>
          </div>
        </div>
      {:else if average !== null}
        <div class="p-8">
          <h2
            class="text-blue-200 text-sm uppercase tracking-wider font-semibold mb-6 text-center"
          >
            Analysis Results
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <!-- Average Temperature -->
            <div
              class="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-xl p-6 border border-blue-700/50"
            >
              <div class="text-blue-300 text-sm mb-2 font-medium">
                Average Temperature
              </div>
              <div class="flex items-baseline gap-2">
                <span
                  class="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300"
                >
                  {average.toFixed(2)}
                </span>
                <span class="text-blue-300 text-xl">°C</span>
              </div>
            </div>

            <!-- Record Count -->
            <div
              class="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-xl p-6 border border-blue-700/50"
            >
              <div class="text-blue-300 text-sm mb-2 font-medium">
                Records Analyzed
              </div>
              <div class="flex items-baseline gap-2">
                <span
                  class="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300"
                >
                  {recordCount.toLocaleString()}
                </span>
                <span class="text-blue-300 text-xl">samples</span>
              </div>
            </div>
          </div>

          <!-- Additional Info -->
          <div class="bg-blue-950/30 rounded-lg p-4 border border-blue-800/30">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div
                  class="text-blue-400/70 text-xs uppercase tracking-wide mb-1"
                >
                  Data Type
                </div>
                <div class="text-blue-200 font-medium">Temperature, water</div>
              </div>
              <div>
                <div
                  class="text-blue-400/70 text-xs uppercase tracking-wide mb-1"
                >
                  ResultValue Index
                </div>
                <div class="text-blue-200 font-mono">{resultValueIndex}</div>
              </div>
              <div>
                <div
                  class="text-blue-400/70 text-xs uppercase tracking-wide mb-1"
                >
                  CharacteristicName Index
                </div>
                <div class="text-blue-200 font-mono">
                  {characteristicNameIndex}
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="p-12 text-center">
          <div class="text-blue-400/50 mb-3">
            <svg
              class="w-20 h-20 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p class="text-blue-300 text-lg">
            Upload a CSV file to begin analysis
          </p>
          <p class="text-blue-400/60 text-sm mt-2">
            The system will automatically calculate the average water
            temperature
          </p>
        </div>
      {/if}
    </div>

    <!-- Footer Info -->
    <div class="mt-8 text-center text-blue-400/50 text-sm">
      <p>Columns are automatically detected from CSV header row</p>
    </div>
  </div>
</div>
