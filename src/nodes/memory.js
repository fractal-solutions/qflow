import { AsyncNode } from '@/qflow.js';
import { promises as fs } from 'fs';
import path from 'path';

export class MemoryNode extends AsyncNode {  

    static getToolDefinition() {
        return {
            name: "memory_node",
            description: "Stores and retrieves text memories (keyword-based).",
            parameters: {
                type: "object",
                properties: {
                action: {
                    type: "string",
                    enum: ["store", "retrieve"],
                    description: "The action to perform: 'store' a new memory or 'retrieve' existing ones."
                },
                content: {
                    type: "string",
                    description: "Required for 'store' action. The text content of the memory to store."
                },
                query: {
                    type: "string",
                    description: "Required for 'retrieve' action. Keywords to search for within stored memories."
                },
                id: {
                    type: "string",
                    description: "Optional for 'store' action. A unique identifier for the memory. If not provided, one will be generated."
                },
                memoryPath: {
                    type: "string",
                    description: "Optional. The directory path where memories are stored. Defaults to './agent_memories'."
                }
                },
                required: ["action"]
            }
        };
    }

    async execAsync() {    
        const { action, content, query, id, memoryPath = './agent_memories' } = this.params;    
        if (!action) {      
            throw new Error('MemoryNode requires an `action` (store or retrieve).');    
        }    
        const fullMemoryPath = path.resolve(memoryPath);    
        switch (action) {      
            case 'store':        
                if (!content) {          
                    throw new Error('Store action requires `content`.');        
                }        
                const memoryId = id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;        
                const filePath = path.join(fullMemoryPath, `${memoryId}.txt`);        
                await fs.mkdir(fullMemoryPath, { recursive: true });        
                await fs.writeFile(filePath, content, 'utf-8');        
                console.log(`[MemoryNode] Stored memory: ${memoryId}`);        
                return { status: 'stored', id: memoryId, filePath };      
            
            case 'retrieve':        
                if (!query) {          
                    throw new Error('Retrieve action requires a `query`.');        
                }        
                console.log(`[MemoryNode] Retrieving memories for query: "${query}"...`);        
                const retrievedMemories = [];        
                try {          
                    const files = await fs.readdir(fullMemoryPath);          
                    for (const file of files) {            
                        if (file.endsWith('.txt')) {              
                            const filePath = path.join(fullMemoryPath, file);              
                            const fileContent = await fs.readFile(filePath, 'utf-8');              
                            if (fileContent.toLowerCase().includes(query.toLowerCase())) {                
                                retrievedMemories.push({ id: file.replace('.txt', ''), content: fileContent });              
                            }            
                        }          
                    }        
                } catch (error) {          
                    if (error.code === 'ENOENT') {            
                        console.log(`[MemoryNode] Memory path ${fullMemoryPath} does not exist. No memories to retrieve.`);            
                        return [];          
                    }          
                    throw error;        
                }        
                console.log(`[MemoryNode] Retrieved ${retrievedMemories.length} memories.`);        
                return retrievedMemories; 

            default:        
                throw new Error(`Unsupported action: ${action}`);    
        }  
    }  
    
    async postAsync(shared, prepRes, execRes) {    
        shared.memoryResult = execRes;    
        return 'default';  
    }
}