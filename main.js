window.onload = () => {
  // Set the width and height of the SVG container
  const width = 500;
  const height = 500;
  
  async function forceLayout() {
    const nodes = [];
    const links = [];
    const nodeSet = new Set();
    
    const data = await d3.csv("./data/flights-airport-5000plus.csv");
    
    data.forEach((row) => {
      const origin = row.origin;
      const destination = row.destination;
      const count = +row.count;

      // Create links between origin and destination airports
      links.push({ source: origin, target: destination, value: count });

      // Add unique origin and destination nodes
      if (!nodeSet.has(origin)) {
        nodes.push({ id: origin, name: origin });
        nodeSet.add(origin)
      }
      
      if (!nodeSet.has(destination)) {
        nodes.push({ id: destination, name: destination });
        nodeSet.add(destination)
      }
    });
    
    // Load airports data
    const airportsData = await d3.csv("./data/airports.csv");
    const airportsMap = new Map();
    
    airportsData.forEach((airport) => {
      airportsMap.set(airport.iata, airport.name);
    });
    
    // Add airport names to nodes
    nodes.forEach(node => {
      const airportName = airportsMap.get(node.id);
      if (airportName) {
        node.name = airportName;
      }
    });       
      
    nodes.forEach(n => n.value = links.reduce(
      (a, l) => l.source === n.id || l.target === n.id ? a + l.value : a, 0)
    );
    
    ForceGraph(
      { nodes, links }, 
      { 
        width, 
        height,
        nodeTitle: d => `${d.id} - ${d.name}`,
        linkStrength: d => Math.sqrt(d.data.value) / 10000,
        nodeRadius: d => d.value / 10000,
        linkStrokeWidth: d => d.value / 1000,
      });
  }

  async function mapLayout() {
    const nodes = [];
    const links = [];
    const nodeSet = new Set();
    
    const flightsData = await d3.csv("./data/flights-airport-5000plus.csv");
    
    flightsData.forEach((row) => {
      const origin = row.origin;
      const destination = row.destination;
      const count = +row.count;

      // Create links between origin and destination airports
      links.push({ source: origin, target: destination, value: count });

      // Add unique origin and destination nodes
      if (!nodeSet.has(origin)) {
        nodes.push({ id: origin });
        nodeSet.add(origin);
      }
      
      if (!nodeSet.has(destination)) {
        nodes.push({ id: destination });
        nodeSet.add(destination);
      }
    });
    
    // Load airports data for coordinates
    const airportsData = await d3.csv("./data/airports.csv");
    const airportsMap = new Map();
    
    airportsData.forEach((airport) => {
      airportsMap.set(airport.iata, {
        name: airport.name,
        city: airport.city,
        state: airport.state,
        latitude: +airport.latitude,
        longitude: +airport.longitude
      });
    });
    
    // Add geographical data to nodes
    nodes.forEach(node => {
      const airportInfo = airportsMap.get(node.id);
      if (airportInfo) {
        node.latitude = airportInfo.latitude;
        node.longitude = airportInfo.longitude;
        node.name = airportInfo.name;
        node.city = airportInfo.city;
        node.state = airportInfo.state;
      }
    });
    
    // Calculate node values (based on total traffic)
    nodes.forEach(n => n.value = links.reduce(
      (a, l) => l.source === n.id || l.target === n.id ? a + l.value : a, 0)
    );
    
    // Filter out nodes and links without coordinates
    const validNodes = nodes.filter(n => n.latitude && n.longitude);
    const validNodeIds = new Set(validNodes.map(n => n.id));
    const validLinks = links.filter(l => validNodeIds.has(l.source) && validNodeIds.has(l.target));
    
    // Create the map
    const map = L.map('visualization-container').setView([39.8283, -98.5795], 4); // Approximate center of the USA
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    const nodesById = new Map(validNodes.map(n => [n.id, n]));
    
    // Draw edges
    validLinks.forEach(link => {
      const sourceNode = nodesById.get(link.source);
      const targetNode = nodesById.get(link.target);
      
      if (sourceNode && targetNode) {
        const latlngs = [
          [sourceNode.latitude, sourceNode.longitude],
          [targetNode.latitude, targetNode.longitude]
        ];
        
        const lineWidth = link.value / 1000; 
        
        L.polyline(latlngs, {
          color: '#4f6097ff',
          weight: lineWidth,
          opacity: 0.6
        }).addTo(map);
      }
    });
    
    // Draw nodes
    validNodes.forEach(node => {
      const radius = node.value / 10000;
      
      L.circleMarker([node.latitude, node.longitude], {
        radius: Math.max(radius, 3), //Minimunm size so that it is visible
        fillColor: '#aa1a39ff',
        color: '#fff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.8
      })
      .bindTooltip(`${node.id} - ${node.name}`, {
        permanent: false,
        direction: 'top'
      })
      .bindPopup(`<b>${node.id}</b><br>${node.name}<br>${node.city}, ${node.state}<br>Total flights: ${node.value.toLocaleString()}`)
      .addTo(map);
    });

    return map;
  }  

  function draw(layoutType) {
    const container = document.getElementById("visualization-container");
    if (window.currentMap) {
      window.currentMap.remove();
      window.currentMap = null;
    }

    container.innerHTML = "";

    // Update button states
    const forceBtn = document.getElementById("force-btn");
    const mapBtn = document.getElementById("map-btn");
    
    if (layoutType === "force") {
      forceBtn.classList.add("active");
      mapBtn.classList.remove("active");
      forceLayout();
    } else if (layoutType === "map") {
      mapBtn.classList.add("active");
      forceBtn.classList.remove("active");
      
      mapLayout().then((map) => {
        window.currentMap = map;
      });
    }
  }

  document.getElementById("force-btn").addEventListener("click", () => {
    draw("force");
  });
  document.getElementById("map-btn").addEventListener("click", () => {
    draw("map");
  });
  draw("force");
};
