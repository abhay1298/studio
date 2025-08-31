
export type LogEntry = {
  text: string;
  level: number;
  status: 'PASS' | 'FAIL' | 'INFO' | 'WARN' | 'KEYWORD';
  children: LogEntry[];
  duration?: string;
};

// Simplified keywords that indicate structure or important actions
const KEYWORD_START_INDICATORS = ['START_SUITE', 'START_TEST', 'START_KEYWORD'];
const KEYWORD_END_INDICATORS = ['END_SUITE', 'END_TEST', 'END_KEYWORD'];

function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*\|?\s*)/);
  // This is a rough approximation. A more robust solution might count pipes or specific spacing.
  return match ? match[0].length : 0;
}

function getStatus(line: string): LogEntry['status'] {
    if (line.includes('| PASS |') || line.startsWith('PASS')) return 'PASS';
    if (line.includes('| FAIL |') || line.startsWith('FAIL')) return 'FAIL';
    if (line.includes('| WARN |')) return 'WARN';
    if (line.includes('| INFO |')) return 'INFO';
    if (KEYWORD_START_INDICATORS.some(k => line.includes(k)) || KEYWORD_END_INDICATORS.some(k => line.includes(k))) {
      return 'KEYWORD';
    }
    return 'INFO';
}

function cleanLogLine(line: string): string {
    // Remove timestamp and log level prefixes like [20:13:06.487] [INFO]
    return line.replace(/^\[.*?\]\s*\[.*?\]\s*/, '').trim();
}

function extractDuration(line: string): string | undefined {
    const match = line.match(/\((\d+\.\d+s)\)$/);
    return match ? match[1] : undefined;
}


export function parseRobotLogs(logLines: string[]): LogEntry[] {
    const root: LogEntry = {
        text: 'root',
        level: -1,
        status: 'KEYWORD',
        children: [],
    };

    const parentStack: LogEntry[] = [root];

    for (const rawLine of logLines) {
        if (!rawLine || !rawLine.trim()) continue;

        const line = cleanLogLine(rawLine);
        if (!line.trim() || line.startsWith('=')) continue;

        const level = getIndentLevel(line);
        const status = getStatus(line);
        const duration = extractDuration(line);
        const text = line.replace(/\s*\(\d+\.\d+s\)$/, '');

        const newEntry: LogEntry = {
            text,
            level,
            status,
            children: [],
            duration,
        };

        // This logic is simplified. A truly robust parser would need to be much more complex.
        // This assumes that an increase in indentation means it's a child of the previous line.
        let parent = parentStack[parentStack.length - 1];
        
        while (level <= parent.level && parentStack.length > 1) {
            parentStack.pop();
            parent = parentStack[parentStack.length - 1];
        }

        parent.children.push(newEntry);

        // If a line is a structural element (like START_KEYWORD), it becomes the new parent.
        if (hasChildren(line)) {
            parentStack.push(newEntry);
        }
    }
    
    // This is a heuristic to try and group simple log lines under the last keyword
    function groupLooseChildren(nodes: LogEntry[]) {
        let lastParent: LogEntry | null = null;
        const newNodes: LogEntry[] = [];

        for (const node of nodes) {
            if (node.children.length > 0) {
                 groupLooseChildren(node.children);
            }
            if (isParent(node)) {
                lastParent = node;
                newNodes.push(node);
            } else if (lastParent && !isParent(node)) {
                 lastParent.children.push(node);
            } else {
                 newNodes.push(node);
            }
        }
        return newNodes;
    }
    
    // A simple heuristic to determine if a line can have children
    function hasChildren(line: string) {
       return KEYWORD_START_INDICATORS.some(k => line.includes(k)) || line.endsWith(':');
    }

    function isParent(entry: LogEntry) {
         return entry.status === 'KEYWORD' || entry.text.includes('::') || entry.text.endsWith(':');
    }
    
    // Don't use the grouping for now as it's too aggressive
    // return groupLooseChildren(root.children);
    return root.children;
}
