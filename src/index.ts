import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as traverse from 'traverse';
import * as path from 'path';
import equal = require('deep-equal');

const keyId = core.getInput('sortKey');
const uniqueKeysString = core.getInput('uniqueKeys');
const requiredKeyTypesString = core.getInput('requiredKeyTypes');
const optionalKeyTypesString = core.getInput('optionalKeyTypes');
const filePath = core.getInput('file');
const repo = github.context.repo.repo;

const workspace = process.env.GITHUB_WORKSPACE || __dirname;
const sourcePath = path.resolve(workspace, filePath);

const uniqueKeys = uniqueKeysString ? uniqueKeysString.split(",") : [];
const requiredKeyTypes = requiredKeyTypesString ? requiredKeyTypesString.split(",") : [];
const optionalKeyTypes = optionalKeyTypesString ? optionalKeyTypesString.split(",") : [];

const expectedType = (value: any, type: string) => {
  if (type.includes("[]")) {
    if (Array.isArray(value)) {
      const elementType = type.split("[]")[0];
      return !value.some((x) => typeof x !== elementType);
    } else {
      return false;
    }
  }
  return (typeof value === type);
}

const verify = (sourcePath: string) => {

  const source = traverse(yaml.safeLoad(fs.readFileSync(sourcePath, 'utf8')));
  let errorCount = 0;

  source.forEach(function (node: any) {
    if (Array.isArray(node)) {

      // Clone the array because sort will do in place sort of the variable
      const originalNode = node.map((x) => x);
      // Sort the array by keyId alphabetically if not, just sort normally
      // the value needs to be parsed to string so that the comparison works
      node.sort((a, b) => {
        if (keyId) {
          return (a[keyId] + "" > b[keyId] + "") ? 1 : ((b[keyId] + "" > a[keyId] + "") ? -1 : 0);
        } else {
          return (a + "" > b + "") ? 1 : ((b + "" > a + "") ? -1 : 0);
        }
      });
      
      // Check if there's a diff between given array and sorted array by keyId
      const diff = !equal(node, originalNode);
      
      // If there's a diff report an error
      if (diff) {
        const path = this.path.length ? "key '" + this.path.join(".") + "'" : "ROOT";
        const key = keyId ? "by key '" + keyId  + "'" : "";
        console.error(`Diff found between the sorted and unsorted array: `);
        console.error(JSON.stringify(node.map(x => keyId ? x[keyId] : x)));
        console.error(JSON.stringify(originalNode.map(x => keyId ? x[keyId] : x)));
        const errorMessage = `ERROR: The elements of array at ${path} of file '${filePath}' is NOT sorted alphabetically '${key}' for repo '${repo}'`;
        console.error(errorMessage);
        errorCount++;
      }

      node.forEach((nodeElement) => {

        if (nodeElement && typeof nodeElement !== "object") {
          return;
        }

        if (!nodeElement) {
          return;
        }

        if (requiredKeyTypes.length) {
          requiredKeyTypes.forEach((keyType: string) => {

            const [key, type]: string[] = keyType.split(":");
            // If the key is not set, throw error
            if (!nodeElement[key]) {
              console.error(`ERROR: The required key '${key}' is not set for element ${JSON.stringify(nodeElement)}`);
              errorCount++;
            }
            // If the type is wrong return
            if (!expectedType(nodeElement[key], type)) {
              console.error(`ERROR: The expected type of required key '${key}' in ${JSON.stringify(nodeElement)} should be ${type}`);
              errorCount++;
            }

          });
        }

        if (optionalKeyTypes.length) {
          optionalKeyTypes.forEach((keyType: string) => {
            const [key, type]: string[] = keyType.split(":");
            // If the type is wrong return
            if (nodeElement[key] && !expectedType(nodeElement[key], type)) {
              console.error(`ERROR: The expected type of optional key '${key}' in ${JSON.stringify(nodeElement)} should be ${type}`);
              errorCount++;
            }
          });
        }

      });

      // Check if there's a duplicate of the value of a key
      if (uniqueKeys.length) {
        uniqueKeys.forEach((uniqueKey: string) => {

          const duplicateValues: any[] = [];
          const valueArray = node.map(x => x[uniqueKey]).filter((x) => !!x);

          if (!valueArray.length) {
            return;
          }

          const hasDuplicate = valueArray.some((val, i, arr) => {
            if (arr.indexOf(val) === i) {
              return false;
            }
            duplicateValues.push(val);
            return true;
          });

          // If it has duplicate set error
          if (hasDuplicate) {
            console.error(`ERROR: The value in this array ${JSON.stringify(duplicateValues)} for key '${uniqueKey}' should be unique`);
            errorCount++;
          }
        })
      }
      

    }
  });

  if (errorCount > 0) {
    const errorMessage = `${errorCount} error(s) found, please check the log above`;
    console.error(errorMessage);
    core.setFailed(errorMessage);
  }
}

verify(sourcePath);