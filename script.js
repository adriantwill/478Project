const margin = { top: 20, right: 20, bottom: 20, left: 40 };
const width = 960;
const height = 600;
const svg = d3.select("#usMap");
const map_tooltip = d3.select("#map_tooltip");

d3.json("https://d3js.org/us-10m.v1.json").then((us) => {
  const path = d3.geoPath();
  svg
    .append("g")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.states).features)
    .enter()
    .append("path")
    .attr("class", "state")
    .attr("d", path)
    .on("mouseout", function (event, d) {
      d3.select(this).style("fill", "#cce5df");
      map_tooltip.style("display", "none");
    })
    .on("mouseover", function (event, d) {
      d3.select(this).style("fill", "#77cba4");
      const stateId = d.id;
      d3.csv("NFL_team_data.csv").then((data) => {
        console.log(stateId);
        const teamsInState = data.filter((team) => team.id === stateId);
        map_tooltip
          .style("display", "block")
          .style("left", `${event.pageX}px`)
          .style("top", `${event.pageY}px`);
        if (teamsInState.length > 0) {
          const teamInfo = teamsInState
            .map(
              (team) =>
                `<strong>${team.team_name}</strong><br>Stadium: ${team.home_stadium}<br>Conference: ${team.conference}<br>Division: ${team.division}<br>Superbowl Wins: ${team.superbowl_wins}`
            )
            .join("<br><br>");

          map_tooltip.html(`${teamInfo}`);
        } else {
          map_tooltip.html("There is no team in this state");
        }
      });
    });
});

d3.csv("data.csv").then((data) => {
  const margin = { top: 50, right: 20, bottom: 50, left: 200 };
  const width = 1400 - margin.left - margin.right;
  const height = 700 - margin.top - margin.bottom;

  const teams = data.map((d) => d.Tm);
  const weeks = Object.keys(data[0]).slice(4);
  data.forEach((d) => {
    weeks.forEach((week) => {
      d[week] = week === "Bye" ? 0 : +d[week];
    });
  });

  const xScale = d3.scaleBand().domain(weeks).range([0, width]).padding(0.05);

  const yScale = d3.scaleBand().domain(teams).range([0, height]).padding(0.05);

  const colorScale = d3
    .scaleSequential(d3.interpolateBlues)
    .domain([
      d3.min(data, (d) => d3.min(weeks, (week) => d[week])),
      d3.max(data, (d) => d3.max(weeks, (week) => d[week])),
    ]);

  const svg = d3
    .select("#heatmap")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg
    .selectAll(".heatmap")
    .data(
      data.flatMap((d) =>
        weeks.map((week) => ({ team: d.Tm, week, value: d[week] }))
      )
    )
    .enter()
    .append("rect")
    .attr("x", (d) => xScale(d.week))
    .attr("y", (d) => yScale(d.team))
    .attr("id", (d) => `${d.team}-${d.week}`)
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", (d) => colorScale(d.value))
    .on("mouseout", function (event, d) {
      map_tooltip.style("display", "none");
    })
    .on("mouseover", function (event, d) {
      let teamName = d3.select(this).attr("id");
      d3.csv("data.csv").then((data) => {
        [teamName, weekNum] = teamName.split("-");
        const teamData = data.find((row) => row.Tm === teamName);
        const value = teamData[weekNum];
        if (value != "Bye") {
          map_tooltip.html(
            `The ${teamName} had ${value} people show up ${weekNum}`
          );
        } else {
          map_tooltip.html(`The ${teamName} had a bye in ${weekNum}`);
        }
        map_tooltip
          .style("display", "block")
          .style("left", `${event.pageX}px`)
          .style("top", `${event.pageY}px`);
      });
    });

  svg
    .append("g")
    .call(d3.axisTop(xScale))
    .attr("class", "axis")
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "start");

  svg.append("g").call(d3.axisLeft(yScale)).attr("class", "axis");
});

const usMapWaypoint = new Waypoint({
  element: document.getElementById("usMap"),
  handler: function (direction) {
    if (direction === "down") {
      d3.select("#usMap").style("opacity", 1);
      d3.select("#heatmap").style("opacity", 0);
    }
  },
  offset: "50%",
});

const heatmapWaypoint = new Waypoint({
  element: document.getElementById("heatmap"),
  handler: function (direction) {
    if (direction === "down") {
      d3.select("#usMap").style("opacity", 0);
      d3.select("#heatmap").style("opacity", 1);
    } else {
      d3.select("#usMap").style("opacity", 1);
      d3.select("#heatmap").style("opacity", 0);
    }
  },
  offset: "50%",
});

function createRadialChart(data) {
  d3.select("#radial-chart").selectAll("*").remove();

  const radialChartContainer = d3.select("#radial-chart");
  const margin = { top: 50, right: 150, bottom: 50, left: 150 };
  const width = 1300 - margin.left - margin.right;
  const height = 900 - margin.top - margin.bottom;
  const innerRadius = 150;
  const outerRadius = Math.min(width, height) / 2 - 100;

  // Identify top teams (Dallas Cowboys and New York Jets)
  const topTeams = ['Dallas Cowboys', 'New York Jets'];

  const processedData = data.map(d => ({
    team: d.Tm,
    total: +d.Total,
    home: +d.Home,
    away: +d.Away,
    totalPercentage: ((+d.Total / d3.sum(data, f => +f.Total)) * 100).toFixed(2),
    isTopTeam: topTeams.includes(d.Tm)
  })).sort((a, b) => b.total - a.total);

  const svg = radialChartContainer
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${width/2 + margin.left},${height/2 + margin.top})`);

  const colorScale = d3.scaleSequential()
    .domain([d3.min(processedData, d => d.total), d3.max(processedData, d => d.total)])
    .interpolator(d3.interpolateBlues);

  // Custom color for top teams - using darkest blue
  const getTeamColor = (d) => {
    if (d.data.isTopTeam) {
      return '#00072D'; // Darkest navy blue
    }
    return colorScale(d.data.total);
  };

  const pie = d3.pie()
    .value(d => d.total)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(d => {
      const scale = d3.scaleLinear()
        .domain([d3.min(processedData, d => d.total), d3.max(processedData, d => d.total)])
        .range([innerRadius + 100, outerRadius]);
      return scale(d.data.total);
    });

  const arcs = svg.selectAll(".arc")
    .data(pie(processedData))
    .enter()
    .append("g")
    .attr("class", "arc");

  let activeTeam = null;

  // Create a tooltip div with fixed positioning
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "fixed")
    .style("background", "white")
    .style("padding", "10px")
    .style("border", "1px solid black")
    .style("border-radius", "5px")
    .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
    .style("max-width", "250px")
    .style("z-index", "1000")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // Function to position tooltip safely within viewport
  const positionTooltip = (event) => {
    const tooltipWidth = 250; // Approximate width of tooltip
    const tooltipHeight = 150; // Approximate height of tooltip
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = event.clientX + 10;
    let top = event.clientY + 10;

    // Adjust horizontal position if tooltip goes off screen
    if (left + tooltipWidth > windowWidth) {
      left = event.clientX - tooltipWidth - 10;
    }

    // Adjust vertical position if tooltip goes off screen
    if (top + tooltipHeight > windowHeight) {
      top = event.clientY - tooltipHeight - 10;
    }

    return { left, top };
  };

  const paths = arcs.append("path")
    .attr("d", arc)
    .attr("fill", getTeamColor)
    .attr("stroke", d => d.data.isTopTeam ? "gold" : "white")
    .attr("stroke-width", d => d.data.isTopTeam ? 4 : 2)
    .on("mouseover", function(event, d) {
      if (!activeTeam || activeTeam === d.data.team) {
        // Prevent multiple simultaneous hover effects
        d3.selectAll(".arc path")
          .attr("opacity", 0.5);
        
        d3.select(this)
          .attr("opacity", 1)
          .transition()
          .duration(200)
          .attr("stroke", "gold")
          .attr("stroke-width", 4);

        const { left, top } = positionTooltip(event);

        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        tooltip.html(`
          <strong>${d.data.team}</strong><br>
          Total Attendance: ${d.data.total.toLocaleString()}<br>
          Percentage: ${d.data.totalPercentage}%<br>
          Home Attendance: ${d.data.home.toLocaleString()}<br>
          Away Attendance: ${d.data.away.toLocaleString()}
        `)
        .style("left", `${left}px`)
        .style("top", `${top}px`);

        svg.selectAll(".team-label")
          .style("opacity", 0.2);
        
        d3.select(`#team-label-${d.data.team.replace(/\s+/g, '-')}`)
          .style("opacity", 1)
          .style("font-size", "14px");
      }
    })
    .on("mouseout", function(event, d) {
      if (!activeTeam) {
        d3.selectAll(".arc path")
          .attr("opacity", 1)
          .attr("stroke", d => d.data.isTopTeam ? "gold" : "white")
          .attr("stroke-width", d => d.data.isTopTeam ? 4 : 2);

        tooltip.transition()
          .duration(500)
          .style("opacity", 0);

        svg.selectAll(".team-label")
          .style("opacity", d => d.data.isTopTeam ? 1 : 0.2)
          .style("font-size", "12px");
      }
    })
    .on("click", function(event, d) {
      event.stopPropagation();

      if (activeTeam === d.data.team) {
        activeTeam = null;
        
        d3.selectAll(".arc path")
          .attr("opacity", 1)
          .attr("stroke", d => d.data.isTopTeam ? "gold" : "white")
          .attr("stroke-width", d => d.data.isTopTeam ? 4 : 2);

        svg.selectAll(".team-label")
          .style("opacity", d => d.data.isTopTeam ? 1 : 0.2)
          .style("font-size", "12px");

        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      } else {
        activeTeam = d.data.team;
        
        d3.selectAll(".arc path")
          .attr("opacity", 0.3);

        d3.selectAll(".arc path")
          .filter(arcData => 
            arcData.data.isTopTeam || arcData.data.team === activeTeam
          )
          .attr("opacity", 1)
          .attr("stroke", "gold")
          .attr("stroke-width", 4);

        const { left, top } = positionTooltip(event);

        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        tooltip.html(`
          <strong>${d.data.team}</strong><br>
          Total Attendance: ${d.data.total.toLocaleString()}<br>
          Percentage: ${d.data.totalPercentage}%<br>
          Home Attendance: ${d.data.home.toLocaleString()}<br>
          Away Attendance: ${d.data.away.toLocaleString()}
        `)
        .style("left", `${left}px`)
        .style("top", `${top}px`);

        svg.selectAll(".team-label")
          .style("opacity", arcData => 
            arcData.data.isTopTeam || arcData.data.team === activeTeam ? 1 : 0.2
          )
          .style("font-size", "12px");
      }
    });

  // Rest of the code remains the same as in the previous version...
  // (arcs, labels, legend, zoom functionality)
  
  // Keeping the rest of the function identical to the previous version
  arcs.append("text")
    .attr("id", d => `team-label-${d.data.team.replace(/\s+/g, '-')}`)
    .attr("class", "team-label")
    .attr("transform", d => {
      const pos = arc.centroid(d);
      pos[0] *= 1.8; 
      pos[1] *= 1.5;
      return `translate(${pos})`;
    })
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text(d => `${d.data.totalPercentage}%`)
    .style("fill", "black")
    .style("font-weight", "bold")
    .style("opacity", d => d.data.isTopTeam ? 1 : 0.2);

  svg.append("text")
    .attr("x", 0)
    .attr("y", -outerRadius - 70)
    .attr("text-anchor", "middle")
    .style("font-size", "24px")
    .style("font-weight", "bold")
    .text("NFL Team Attendance Breakdown");

  const legend = svg.append("g")
    .attr("transform", `translate(${outerRadius + 50}, ${-outerRadius})`);

  const legendRectSize = 20;
  const legendItemHeight = 25;

  const legendItems = legend.selectAll(".legend-item")
    .data(processedData)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * legendItemHeight})`);

  legendItems.append("rect")
    .attr("width", legendRectSize)
    .attr("height", legendRectSize)
    .style("fill", d => {
      if (d.isTopTeam) {
        return '#00072D'; 
      }
      return colorScale(d.total);
    });

  legendItems.append("text")
    .attr("x", legendRectSize + 10)
    .attr("y", legendRectSize / 2)
    .attr("dy", "0.5em")
    .style("font-size", "14px")
    .text(d => `${d.totalPercentage}%`);

  const zoom = d3.zoom()
    .scaleExtent([1, 4])
    .on("zoom", function(event) {
      svg.attr("transform", event.transform);
    });

  svg.call(zoom);

  svg.on("click", function(event) {
    if (event.target === this) {
      const currentTransform = d3.zoomTransform(this);
      const newTransform = currentTransform.scale(currentTransform.k * 0.9);
      svg.transition().duration(500).call(zoom.transform, newTransform);
    }
  });
}

d3.csv("data.csv").then(createRadialChart);