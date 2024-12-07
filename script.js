const margin = { top: 20, right: 20, bottom: 20, left: 40 };
const width = 960;
const height = 600;
const svg = d3.select("#usMap");
const map_tooltip = d3.select("#map_tooltip");
Promise.all([
  d3.csv("NFL_team_data.csv"),
  d3.csv("nfl_team_stats_2002-2023.csv"), 
  d3.json("https://d3js.org/us-10m.v1.json"),
]).then(([teamData, statsData, us]) => {
  const teams = teamData.map((d) => d.team_name);

const off_stats = d3
  .select("#off_stats")
  .append("svg")
  .attr("width", width + 100 + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const def_stats = d3
  .select("#def_stats")
  .append("svg")
  .attr("width", width + 100 + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const xScale = d3.scalePoint().range([10, width + 100]).padding(0.15);
const yScale = d3.scaleLinear().range([height, 0]);

const xAxis = (svg) => svg.append("g").attr("transform", `translate(0,${height})`);
const yAxis = (svg) => svg.append("g");

function updateGraph(selectedTeam) {
  selectedTeam = selectedTeam.split(" ")
  selectedTeam = selectedTeam[selectedTeam.length - 1]
  let selectedTeams = []
  if(selectedTeam !== "Cowboys" && selectedTeam !== "Cardinals"){
    selectedTeams = ["Cardinals", "Cowboys", selectedTeam];
  } else {
    selectedTeams = ["Cowboys", "Cardinals"];
  }

  const teamStats = statsData.filter(
    (d) => selectedTeams.some(team => 
      team.includes(d.home) || team.includes(d.away)
    ) && d.season === "2023"
  );

  const yardsData = selectedTeams.flatMap((team) => {
    return teamStats
      .filter((d) => d.home === team || d.away === team)
      .map((d, index, arr) => {
        let yards = 0;
        let oppYards = 0;
        if (team === d.home) {
          yards = +d.yards_home;
          oppYards = +d.yards_away;
        } else if (team === d.away) {
          yards = +d.yards_away;
          oppYards = +d.yards_home;
        }

        let weekLabel;
        if (d.week === "Division" || d.week === "Wildcard" || d.week === "Superbowl" || d.week === "Conference") {
          weekLabel = d.week;
        } else {
          if (index !== 0 && (+arr[index - 1].week + 1) !== +d.week) {
            if (!isNaN(d.week)) {
              weekLabel = "Game " + (+d.week - 1);
              d.week = d.week - 1
            }
          } else {
            weekLabel = "Game " + d.week;
          }
        }

        return {
          team: team,
          week: weekLabel,
          yards: yards,
          oppYards: oppYards
        };
      });
  });

  yardsData.sort((a, b) => {
    const weekA = a.week.match(/\d+/) ? +a.week.match(/\d+/)[0] : a.week;
    const weekB = b.week.match(/\d+/) ? +b.week.match(/\d+/)[0] : b.week;

    if (typeof weekA === 'number' && typeof weekB === 'number') {
      return weekA - weekB;
    } else {
      const weekOrder = ["Wildcard", "Division", "Conference", "Superbowl"];
      return weekOrder.indexOf(weekA) - weekOrder.indexOf(weekB);
    }
  });

  const weeks = Array.from(new Set(yardsData.map((d) => d.week)));

  xScale.domain(weeks);
  yScale.domain([0, d3.max(yardsData, (d) => Math.max(d.yards, d.oppYards)) + 5]);

  // Remove any existing axes first
off_stats.selectAll(".x-axis").remove();
off_stats.selectAll(".y-axis").remove();
def_stats.selectAll(".x-axis").remove();
def_stats.selectAll(".y-axis").remove();

// Redraw x-axis
off_stats.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(xScale));

// Redraw y-axis  
off_stats.append("g")
  .attr("class", "y-axis")
  .call(d3.axisLeft(yScale));

// Repeat for defense stats
def_stats.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(xScale));

def_stats.append("g")
  .attr("class", "y-axis")
  .call(d3.axisLeft(yScale));

  function update(svg, data, yValue, color) {
    const lines = svg
      .selectAll(".lollipop-line")
      .data(data, (d) => d.week + d.team);

    lines
      .enter()
      .append("line")
      .attr("class", "lollipop-line")
      .attr("x1", (d) => (d.team === 'Cowboys' ? xScale(d.week) + 10 : d.team === 'Cardinals' ? xScale(d.week) - 10 : xScale(d.week)))
      .attr("x2", (d) => (d.team === 'Cowboys' ? xScale(d.week) + 10 : d.team === 'Cardinals' ? xScale(d.week) - 10 : xScale(d.week)))
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", (d) => (d.team === selectedTeams[0] ? "blue" : d.team === "Cowboys" ? "green" : "red"))
      .merge(lines)
      .transition()
      .duration(1000)
      .attr("x1", (d) => (d.team === 'Cowboys' ? xScale(d.week) + 10 : d.team === 'Cardinals' ? xScale(d.week) - 10 : xScale(d.week)))
      .attr("x2", (d) => (d.team === 'Cowboys' ? xScale(d.week) + 10 : d.team === 'Cardinals' ? xScale(d.week) - 10 : xScale(d.week)))
      .attr("y2", (d) => yScale(d[yValue]));

    lines.exit().remove();

    const circles = svg
      .selectAll(".lollipop-circle")
      .data(data, (d) => d.week + d.team);

    circles
      .enter()
      .append("circle")
      .attr("class", "lollipop-circle")
      .attr("cx", (d) => (d.team === 'Cowboys' ? xScale(d.week) + 10 : d.team === 'Cardinals' ? xScale(d.week) - 10 : xScale(d.week)))
      .attr("cy", yScale(0))
      .attr("r", 5)
      .attr("fill", (d) => (d.team === selectedTeams[0] ? "blue" : d.team === "Cowboys" ? "green" : "red"))
      .merge(circles)
      .transition()
      .duration(1000)
      .attr("cx", (d) => (d.team === 'Cowboys' ? xScale(d.week) + 10 : d.team === 'Cardinals' ? xScale(d.week) - 10 : xScale(d.week)))
      .attr("cy", (d) => yScale(d[yValue]));

    circles.exit().remove();
  }

  update(off_stats, yardsData, "yards", "current");
  update(def_stats, yardsData, "oppYards", "opponent");
}

  updateGraph(teams[0])
  heatmapTeams = ["Cardinals","Cowboys"];

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
    })
    .on("click", function (event, d) {
      const stateId = d.id;
      const teamsInState = teamData.filter((team) => team.id === stateId);
      if (teamsInState.length > 0) {
        heatmapTeams = updateGraph(teamsInState[0].team_name);
      } else {
        console.log("No NFL teams in this state");
      }
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
      d3.selectAll("rect")
        .filter((d) => heatmapTeams.includes(d.team))
        .style("stroke", "yellow")
        .style("stroke-width", 1);
      d3.selectAll("rect")
        .filter((d) => !heatmapTeams.includes(d.team))
        .style("opacity", 0.4);
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
      d3.select(this).style("opacity", 1);
    });

  d3.selectAll("rect")
    .filter((d) => heatmapTeams.includes(d.team))
    .style("stroke", "yellow")
    .style("stroke-width", 1);
  d3.selectAll("rect")
    .filter((d) => !heatmapTeams.includes(d.team))
    .style("opacity", 0.4);

  // Adjust x-axis (top)
svg
.append("g")
.attr("class", "x-axis")
.call(d3.axisTop(xScale))
.attr("transform", "translate(0, 0)")
.selectAll("text")
.attr("transform", "rotate(-45)")
.style("text-anchor", "start")
.attr("dx", "-.8em")
.attr("dy", ".15em");

// Adjust y-axis (left)
svg
.append("g")
.attr("class", "y-axis")
.call(d3.axisLeft(yScale));
});

function createRadialChart(data) {
  d3.select("#radial-chart").selectAll("*").remove();

  const radialChartContainer = d3.select("#radial-chart");
  const margin = { top: 50, right: 150, bottom: 50, left: 150 };
  const width = 1300 - margin.left - margin.right;
  const height = 900 - margin.top - margin.bottom;
  const innerRadius = 150;
  const outerRadius = Math.min(width, height) / 2 - 100;

  const topTeams = ["Dallas Cowboys", "Las Vegas Raiders"];

  const processedData = data
    .map((d) => ({
      team: d.Tm,
      total: +d.Total,
      home: +d.Home,
      away: +d.Away,
      totalPercentage: (
        (+d.Total / d3.sum(data, (f) => +f.Total)) *
        100
      ).toFixed(2),
      isTopTeam: topTeams.includes(d.Tm),
    }))
    .sort((a, b) => b.total - a.total);

  const svg = radialChartContainer
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr(
      "transform",
      `translate(${width / 2 + margin.left},${height / 2 + margin.top})`
    );

  const colorScale = d3
    .scaleSequential()
    .domain([
      d3.min(processedData, (d) => d.total),
      d3.max(processedData, (d) => d.total),
    ])
    .interpolator(d3.interpolateBlues);

  // Custom color for top teams - using darkest blue
  const getTeamColor = (d) => {
    if (d.data.isTopTeam) {
      return "#00072D"; // Darkest navy blue
    }
    return colorScale(d.data.total);
  };

  const pie = d3
    .pie()
    .value((d) => d.total)
    .sort(null);

  const arc = d3
    .arc()
    .innerRadius(innerRadius)
    .outerRadius((d) => {
      const scale = d3
        .scaleLinear()
        .domain([
          d3.min(processedData, (d) => d.total),
          d3.max(processedData, (d) => d.total),
        ])
        .range([innerRadius + 100, outerRadius]);
      return scale(d.data.total);
    });

  const arcs = svg
    .selectAll(".arc")
    .data(pie(processedData))
    .enter()
    .append("g")
    .attr("class", "arc");

  let activeTeam = null;

  // Create a tooltip div with fixed positioning
  const tooltip = d3
    .select("body")
    .append("div")
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

  const paths = arcs
    .append("path")
    .attr("d", arc)
    .attr("fill", getTeamColor)
    .attr("stroke", (d) => (d.data.isTopTeam ? "gold" : "white"))
    .attr("stroke-width", (d) => (d.data.isTopTeam ? 4 : 2))
    .on("mouseover", function (event, d) {
      if (!activeTeam || activeTeam === d.data.team) {
        // Prevent multiple simultaneous hover effects
        d3.selectAll(".arc path").attr("opacity", 0.5);

        d3.select(this)
          .attr("opacity", 1)
          .transition()
          .duration(200)
          .attr("stroke", "gold")
          .attr("stroke-width", 4);

        const { left, top } = positionTooltip(event);

        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(
            `
          <strong>${d.data.team}</strong><br>
          Total Attendance: ${d.data.total.toLocaleString()}<br>
          Percentage: ${d.data.totalPercentage}%<br>
          Home Attendance: ${d.data.home.toLocaleString()}<br>
          Away Attendance: ${d.data.away.toLocaleString()}
        `
          )
          .style("left", `${left}px`)
          .style("top", `${top}px`);

        svg.selectAll(".team-label").style("opacity", 0.2);

        d3.select(`#team-label-${d.data.team.replace(/\s+/g, "-")}`)
          .style("opacity", 1)
          .style("font-size", "14px");
      }
    })
    .on("mouseout", function (event, d) {
      if (!activeTeam) {
        d3.selectAll(".arc path")
          .attr("opacity", 1)
          .attr("stroke", (d) => (d.data.isTopTeam ? "gold" : "white"))
          .attr("stroke-width", (d) => (d.data.isTopTeam ? 4 : 2));

        tooltip.transition().duration(500).style("opacity", 0);

        svg
          .selectAll(".team-label")
          .style("opacity", (d) => (d.data.isTopTeam ? 1 : 0.2))
          .style("font-size", "12px");
      }
    })
    .on("click", function (event, d) {
      event.stopPropagation();

      if (activeTeam === d.data.team) {
        activeTeam = null;

        d3.selectAll(".arc path")
          .attr("opacity", 1)
          .attr("stroke", (d) => (d.data.isTopTeam ? "gold" : "white"))
          .attr("stroke-width", (d) => (d.data.isTopTeam ? 4 : 2));

        svg
          .selectAll(".team-label")
          .style("opacity", (d) => (d.data.isTopTeam ? 1 : 0.2))
          .style("font-size", "12px");

        tooltip.transition().duration(500).style("opacity", 0);
      } else {
        activeTeam = d.data.team;

        d3.selectAll(".arc path").attr("opacity", 0.3);

        d3.selectAll(".arc path")
          .filter(
            (arcData) =>
              arcData.data.isTopTeam || arcData.data.team === activeTeam
          )
          .attr("opacity", 1)
          .attr("stroke", "gold")
          .attr("stroke-width", 4);

        const { left, top } = positionTooltip(event);

        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(
            `
          <strong>${d.data.team}</strong><br>
          Total Attendance: ${d.data.total.toLocaleString()}<br>
          Percentage: ${d.data.totalPercentage}%<br>
          Home Attendance: ${d.data.home.toLocaleString()}<br>
          Away Attendance: ${d.data.away.toLocaleString()}
        `
          )
          .style("left", `${left}px`)
          .style("top", `${top}px`);

        svg
          .selectAll(".team-label")
          .style("opacity", (arcData) =>
            arcData.data.isTopTeam || arcData.data.team === activeTeam ? 1 : 0.2
          )
          .style("font-size", "12px");
      }
    });

  arcs
    .append("text")
    .attr("id", (d) => `team-label-${d.data.team.replace(/\s+/g, "-")}`)
    .attr("class", "team-label")
    .attr("transform", (d) => {
      const pos = arc.centroid(d);
      pos[0] *= 1.8;
      pos[1] *= 1.5;
      return `translate(${pos})`;
    })
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .text((d) => `${d.data.totalPercentage}%`)
    .style("fill", "black")
    .style("font-weight", "bold")
    .style("opacity", (d) => (d.data.isTopTeam ? 1 : 0.2));
    
  svg.on("click", function (event) {
    if (event.target === this) {
      const currentTransform = d3.zoomTransform(this);
      const newTransform = currentTransform.scale(currentTransform.k * 0.9);
      svg.transition().duration(500).call(zoom.transform, newTransform);
    }
  });
}

d3.csv("Stats_populatiy.csv").then((data) => {
  const margin = { top: 50, right: 20, bottom: 50, left: 0 };
  const width = 1200 - margin.left - margin.right;
  const height = 700 - margin.top - margin.bottom;

  const svg = d3
    .select("#area-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const root = d3
    .hierarchy({
      children: data.map((d) => ({ name: d.Team, value: +d.Instagram })),
    })
    .sum((d) => d.value);

  const treemap = d3.treemap().size([width, height]).paddingInner(1);
  treemap(root);

  const colorScale = d3
    .scaleSequential(d3.interpolateBlues)
    .domain([0, d3.max(data, (d) => +d.Instagram)]);

  svg
    .selectAll("rect")
    .data(root.leaves())
    .enter()
    .append("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("fill", (d) => colorScale(d.value))
    .attr("class", "node");

  svg
    .selectAll("text")
    .data(root.leaves())
    .enter()
    .append("text")
    .attr("x", (d) => d.x0 + 5)
    .attr("y", (d) => d.y0 + 15)
    .text((d) => d.data.name)
    .style("font-size", "12px")
    .style("fill", "#fff")
    .each(function (d) {
      if (this.getBBox().width > d.x1 - d.x0) {
        d3.select(this).text(d.data.name.substring(0, 3) + "...");
      }
    });
});

d3.csv("data.csv").then(createRadialChart);

document.addEventListener("DOMContentLoaded", function () {
  const steps = document.querySelectorAll(".story-step");

  steps.forEach((step) => {
    new Waypoint({
      element: step,
      handler: function (direction) {
        if (direction === "down") {
          steps.forEach((s) => s.classList.remove("active"));
          step.classList.add("active");
        }
      },
      offset: "50%",
    });

    new Waypoint({
      element: step,
      handler: function (direction) {
        if (direction === "up") {
          steps.forEach((s) => s.classList.remove("active"));
          step.classList.add("active");
        }
      },
      offset: "-50%",
    });
  });
});
