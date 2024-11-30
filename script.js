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
d3.select("#heatmap").style("opacity", 0);

function createRadialChart(data) {
  d3.select("#radial-chart").selectAll("*").remove();

  const radialChartContainer = d3.select("#radial-chart");
  const margin = { top: 50, right: 150, bottom: 50, left: 150 };
  const width = 1300 - margin.left - margin.right;
  const height = 900 - margin.top - margin.bottom;
  const innerRadius = 150;
  const outerRadius = Math.min(width, height) / 2 - 100;

  const processedData = data.map(d => ({
    team: d.Tm,
    total: +d.Total,
    home: +d.Home,
    away: +d.Away,
    totalPercentage: ((+d.Total / d3.sum(data, f => +f.Total)) * 100).toFixed(2)
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

  const paths = arcs.append("path")
    .attr("d", arc)
    .attr("fill", d => colorScale(d.data.total))
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .on("mouseover", function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("stroke", "black")
        .attr("stroke-width", 4);

      const tooltip = d3.select("#tooltip")
        .style("display", "block")
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY + 10}px`)
        .html(`
          <strong>${d.data.team}</strong><br>
          Total Attendance: ${d.data.total.toLocaleString()}<br>
          Percentage: ${d.data.totalPercentage}%<br>
          Home Attendance: ${d.data.home.toLocaleString()}<br>
          Away Attendance: ${d.data.away.toLocaleString()}
        `);
    })
    .on("mouseout", function() {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("stroke", "white")
        .attr("stroke-width", 2);

      d3.select("#tooltip").style("display", "none");
    });

  arcs.append("text")
  .attr("transform", d => {
    const pos = arc.centroid(d);
    pos[0] *= 1.8; 
    pos[1] *= 1.5;
    return `translate(${pos})`;
  })
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .text(d => `${d.data.team} (${d.data.totalPercentage}%)`)
  .style("fill", "black")
  .style("font-weight", "bold");

  svg.append("text")
    .attr("x", 0)
    .attr("y", -outerRadius - 70)
    .attr("text-anchor", "middle")
    .style("font-size", "24px")
    .style("font-weight", "bold")
    .text("NFL Team Attendance Breakdown by Percentage Share....");

  const legend = svg.append("g")
    .attr("transform", `translate(${outerRadius + 150}, ${-outerRadius})`);

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
    .style("fill", d => colorScale(d.total));

  legendItems.append("text")
    .attr("x", legendRectSize + 10)
    .attr("y", legendRectSize / 2)
    .attr("dy", "0.5em")
    .style("font-size", "14px")
    .text(d => `${d.team} (${d.totalPercentage}%)`);

  svg.call(d3.zoom()
    .scaleExtent([1, 4])
    .on("zoom", function() {
      svg.attr("transform", d3.event.transform);
    }));

  svg.on("click", function() {
    const currentTransform = d3.zoomTransform(this);
    const newTransform = currentTransform.scale(currentTransform.k * 0.9);
    svg.transition().duration(500).call(d3.zoom().transform, newTransform);
  });
}

d3.csv("data.csv").then(createRadialChart);