#!/usr/bin/env python3
import matplotlib.pyplot as plt

# Sample data
x = [1, 2, 3, 4, 5]
y = [1, 4, 9, 16, 25]

# Create plot
plt.plot(x, y, marker='o', linestyle='-')
plt.title('Sample Plot')
plt.xlabel('X axis')
plt.ylabel('Y axis')
plt.grid(True)

# Save the figure in the current directory
plt.savefig('graph.png')
plt.close()
