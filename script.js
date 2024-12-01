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

function createPolarAreaChart() {
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const width = 800 - margin.left - margin.right;
  const height = 800 - margin.top - margin.bottom;
  const radius = Math.min(width, height) / 2;

  const svg = d3.select("#polar-chart")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${width/2},${height/2})`);

  d3.csv("league_revenue.csv").then((data) => {
    const leagues = ["NFL", "MLB", "NBA", "NHL"];
    const yearRange = d3.extent(data, d => +d.Year);
    
    const colorScale = d3.scaleOrdinal()
      .domain(leagues)
      .range(["#1E5631", "#0077BE", "#C41E3A", "#FFA500"]); 

    const leagueData = leagues.map(league => ({
      league: league,
      revenues: data.map(d => ({
        year: +d.Year,
        revenue: +d[`${league} Revenue (Billion USD)`]
      }))
    }));

    const angleScale = d3.scaleBand()
      .domain(data.map(d => d.Year))
      .range([0, 2 * Math.PI])
      .padding(0.1);

    const radialScale = d3.scaleLinear()
      .domain([0, d3.max(leagueData, d => d3.max(d.revenues, r => r.revenue))])
      .range([0, radius - 50]);

    leagues.forEach((league, index) => {
      const lineRadial = d3.lineRadial()
        .angle(d => angleScale(d.year))
        .radius(d => radialScale(d.revenue))
        .curve(d3.curveCardinal);

      const leagueGroup = svg.append("g")
        .attr("class", `league-group league-${league}`);

      leagueGroup.append("path")
        .datum(leagueData.find(d => d.league === league).revenues)
        .attr("fill", colorScale(league))
        .attr("fill-opacity", 0.5)
        .attr("stroke", colorScale(league))
        .attr("stroke-width", 2)
        .attr("d", lineRadial)
        .on("mouseover", function() {
          d3.selectAll(".league-group")
            .transition()
            .style("opacity", 0.2);
          d3.select(this)
            .transition()
            .style("opacity", 1);
        })
        .on("mouseout", function() {
          d3.selectAll(".league-group")
            .transition()
            .style("opacity", 1);
        });

      leagueGroup.selectAll(".league-point")
        .data(leagueData.find(d => d.league === league).revenues)
        .enter()
        .append("circle")
        .attr("class", "league-point")
        .attr("cx", d => radialScale(d.revenue) * Math.cos(angleScale(d.year) - Math.PI/2))
        .attr("cy", d => radialScale(d.revenue) * Math.sin(angleScale(d.year) - Math.PI/2))
        .attr("r", 4)
        .attr("fill", colorScale(league))
        .on("mouseover", function(event, d) {
          d3.select("#polar-tooltip")
            .style("opacity", 1)
            .html(`
              <strong>${league} League</strong><br>
              Year: ${d.year}<br>
              Revenue: $${d.revenue} Billion
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          d3.select("#polar-tooltip")
            .style("opacity", 0);
        });
    });

    leagues.forEach((league, index) => {
      const angle = (2 * Math.PI / leagues.length) * index;
      const labelRadius = radius + 20;
      
      svg.append("text")
        .attr("x", labelRadius * Math.cos(angle - Math.PI/2))
        .attr("y", labelRadius * Math.sin(angle - Math.PI/2))
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .text(league)
        .attr("fill", colorScale(league))
        .attr("font-weight", "bold");
    });

    const axisCircles = [5, 10, 15, 20];
    svg.selectAll(".radial-axis")
      .data(axisCircles)
      .enter()
      .append("circle")
      .attr("r", d => radialScale(d))
      .attr("fill", "none")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-dasharray", "4 2");

    svg.selectAll(".radial-axis-label")
      .data(axisCircles)
      .enter()
      .append("text")
      .attr("x", 5)
      .attr("y", d => -radialScale(d))
      .attr("text-anchor", "start")
      .attr("alignment-baseline", "middle")
      .text(d => `$${d}B`)
      .attr("font-size", "10px")
      .attr("fill", "#999");

    svg.append("text")
      .attr("x", 0)
      .attr("y", -radius - 30)
      .attr("text-anchor", "middle")
      .text("League Revenues (2004-2023)")
      .attr("font-weight", "bold")
      .attr("font-size", "16px");
  });
}

d3.select("body")
  .append("div")
  .attr("id", "polar-tooltip")
  .style("position", "absolute")
  .style("background", "white")
  .style("border", "1px solid #ddd")
  .style("padding", "10px")
  .style("border-radius", "5px")
  .style("opacity", 0)
  .style("pointer-events", "none");

createPolarAreaChart();