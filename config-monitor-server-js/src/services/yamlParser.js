import yaml from 'js-yaml';

/**
 * Parse YAML content into a flat map of config keys and values.
 * Handles nested structures by flattening keys (e.g., "server.port").
 */
export function parseYaml(yamlContent) {
    try {
        const yamlMap = yaml.load(yamlContent);
        return flattenMap(yamlMap, '');
    } catch (error) {
        throw new Error(`Failed to parse YAML: ${error.message}`);
    }
}

/**
 * Flatten nested YAML structure into dot-notation keys.
 */
function flattenMap(map, prefix) {
    const flattened = {};
    
    for (const [key, value] of Object.entries(map)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            // Recursively flatten nested objects
            Object.assign(flattened, flattenMap(value, fullKey));
        } else {
            // Leaf value
            flattened[fullKey] = value;
        }
    }
    
    return flattened;
}
