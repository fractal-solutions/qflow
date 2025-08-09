import { AsyncFlow } from '@fractal-solutions/qflow';
import { HardwareInteractionNode } from '@fractal-solutions/qflow/nodes';

(async () => {  
    console.log('--- Listing Available Serial Ports ---');  
    const listPortsNode = new HardwareInteractionNode();  
    listPortsNode.setParams({    
        action: 'list_ports'
      });  
      
    try {    
        const ports = await new AsyncFlow(listPortsNode).runAsync({});    
        if (ports && ports.length > 0) {      
            console.log('Found the following serial ports:');      
            ports.forEach(p => {        
                console.log(`  Path: ${p.path}`);        
                console.log(`    Manufacturer: ${p.manufacturer || 'N/A'}`);        
                console.log(`    Serial Number: ${p.serialNumber || 'N/A'}`);        
                console.log(`    Product ID: ${p.productId || 'N/A'}`);        
                console.log(`    Vendor ID: ${p.vendorId || 'N/A'}`);        
                console.log('---');      
            });    
        } else {      
            console.log('No serial ports found.');    
        }  
    } catch (error) {    
        console.error('Failed to list serial ports:', error.message);    
        console.error('Please ensure you have the `serialport` library installed (`npm install serialport` or `bun add serialport`) and proper permissions.');    
        console.error('On Linux, you might need to add your user to the `dialout` group: `sudo usermod -a -G dialout $USER` (then log out and back in).');  }  
        console.log('\n--- Serial Port Listing Example Finished ---');
})();