export function extractId(input: string): {
    type: "MASTER" | "CHILD" | null;
    id: string | null;
  } {
    const masterRegex = /^MASTER:([a-zA-Z0-9]+)$/;
    const childRegex = /^CHILD:([a-zA-Z0-9]+)$/;
  
    let match = input.match(masterRegex);
    if (match) {
      return { type: "MASTER", id: match[1] };
    }
  
    match = input.match(childRegex);
    if (match) {
      return { type: "CHILD", id: match[1] };
    }
  
    return { type: null, id: null };
  }