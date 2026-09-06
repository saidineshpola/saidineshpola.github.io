/*
 * Career graph: nodes are roles, edges are moves between them and an edge's
 * length is proportional to its weight in months. Clicking a node opens its
 * topics and projects; the run button walks Dijkstra from the selected node to
 * the research goal, so the total is the career time needed to get there.
 */
(function (window, document) {
	'use strict';

	var SVG_NS = 'http://www.w3.org/2000/svg';
	var ROOT = 'nitr';
	var GOAL = 'research';

	function logo(domain) {
		return 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=128';
	}

	var NODES = [
		{
			id: 'nitr',
			kind: 'edu',
			name: 'NIT Raipur',
			period: '2014 – 2018',
			short: '2014–18',
			role: 'B.Tech, Electronics & Communication',
			place: 'Raipur, India',
			logo: logo('nitrr.ac.in'),
			tags: ['Data Structures', 'Signals', 'Embedded Systems'],
			notes: ['First contact with machine learning, and the math I still lean on.']
		},
		{
			id: 'iitg',
			kind: 'edu',
			name: 'IIT Guwahati',
			period: '2019 – 2021',
			short: '2019–21',
			role: 'M.Tech, Electronics & Communication',
			place: 'Guwahati, India',
			logo: logo('iitg.ac.in'),
			tags: ['Information Theory', 'Source-Channel Coding', 'Deep Learning'],
			notes: [
				'Thesis: order-preserving interdependent source-channel coding for IoT, cutting bit overhead by 27% over SSCC.',
				'Published at IEEE GCON 2023.'
			]
		},
		{
			id: 'aicrowd',
			kind: 'work',
			branch: true,
			name: 'AICrowd',
			period: 'Jan – Apr 2021',
			short: 'Jan – Apr 2021',
			role: 'Research Fellow, Computer Vision',
			place: 'Remote',
			logo: logo('aicrowd.com'),
			tags: ['Computer Vision', 'Research'],
			notes: ['Turned a biological challenge into a scalable CV pipeline deployed across African regions.']
		},
		{
			id: 'infosys',
			kind: 'work',
			name: 'Infosys',
			period: '2021 – 2025',
			short: '2021–25',
			role: 'Specialist Programmer L3 (AI/ML)',
			place: 'Bengaluru, India',
			logo: logo('infosys.com'),
			tags: ['Multi-Agent Systems', 'RAG', 'Computer Vision', 'Evals'],
			notes: [
				'Multi-agent log analyzer for GE industrial systems, doing root-cause analysis on unstructured logs.',
				'Enterprise document retrieval and RAG, with frameworks to measure subjective relevance.',
				'R&D on OCR, object detection, image classification and segmentation.',
				'My hackathon years: podiums at NeurIPS, CVPR, Amazon and NVIDIA challenges.'
			]
		},
		{
			id: 'nextiva',
			kind: 'work',
			name: 'Nextiva',
			period: '2025 – Aug 2026',
			short: '2025–26',
			role: 'AI Engineer',
			place: 'Bengaluru, India',
			logo: logo('nextiva.com'),
			tags: ['Agentic Search', 'LangGraph', 'LLM Evals'],
			notes: [
				'Agentic search for customer onboarding: web search plus reasoning over the customer domain.',
				'Ground-truth datasets and an automated eval framework that caught prompt regressions before production.'
			]
		},
		{
			id: 'flipkart',
			kind: 'work',
			current: true,
			name: 'Flipkart',
			period: 'Aug 2026 – present',
			short: '2026 –',
			role: 'AI Engineer 2',
			place: 'Bengaluru, India',
			logo: logo('flipkart.com'),
			tags: ['Production AI', 'LLM Systems'],
			notes: ['Building AI features that hold up under real traffic.']
		},
		{
			id: GOAL,
			kind: 'goal',
			name: 'Research',
			period: 'long term',
			short: 'long term',
			role: 'Where I am headed',
			place: '',
			icon: '\uD83D\uDD2C',
			tags: ['Reasoning', 'Interpretability', 'RL'],
			notes: ['Production work today, with the aim of moving into a research role on reasoning, interpretability and RL.']
		}
	];

	/* Weights are months spent at the source, so a route's cost is the career
	   time it takes. The fellowship ran alongside the M.Tech, which makes the
	   detour through AICrowd three months more expensive than going direct. */
	var EDGES = [
		{ from: 'nitr', to: 'iitg', weight: 46 },
		{ from: 'iitg', to: 'infosys', weight: 24 },
		{ from: 'iitg', to: 'aicrowd', weight: 24 },
		{ from: 'aicrowd', to: 'infosys', weight: 3 },
		{ from: 'infosys', to: 'nextiva', weight: 45 },
		{ from: 'nextiva', to: 'flipkart', weight: 15 },
		{ from: 'flipkart', to: GOAL, weight: 0, future: true }
	];

	// Wide layout keeps the fellowship as a branch; tall layout folds it inline.
	var CHAIN_WIDE = ['nitr', 'iitg', 'infosys', 'nextiva', 'flipkart', GOAL];
	var CHAIN_TALL = ['nitr', 'iitg', 'aicrowd', 'infosys', 'nextiva', 'flipkart', GOAL];

	var CFG = {
		nodeR: 26,
		branchR: 20,
		goalR: 24,
		padX: 16,
		minEdge: 50,
		maxEdge: 200,
		goalEdge: 66,
		spineY: 150,
		branchY: 52,
		height: 228,
		vPadTop: 20,
		vSpineX: 60,
		vPerMonth: 1.5,
		vMinEdge: 48,
		vMaxEdge: 130,
		breakpoint: 620,
		stepMs: 320,
		travelMs: 1100
	};

	var selectedId = 'flipkart';
	var lastWidth = 0;
	var state = { plan: null, edges: {}, nodes: {}, layer: null };
	var run = { timers: [], frame: null };

	function byId(id) {
		for (var i = 0; i < NODES.length; i++) {
			if (NODES[i].id === id) return NODES[i];
		}
		return null;
	}

	function edgeBetween(fromId, toId) {
		for (var i = 0; i < EDGES.length; i++) {
			if (EDGES[i].from === fromId && EDGES[i].to === toId) return EDGES[i];
		}
		return null;
	}

	function edgeKey(edge) {
		return edge.from + '>' + edge.to;
	}

	function radius(node) {
		if (node.kind === 'goal') return CFG.goalR;
		if (node.branch) return CFG.branchR;
		return CFG.nodeR;
	}

	function months(value) {
		if (value < 24) return value + ' mo';
		return Math.round(value / 12) + ' yrs';
	}

	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	function svg(name, attrs) {
		var node = document.createElementNS(SVG_NS, name);
		for (var key in attrs) {
			if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, attrs[key]);
		}
		return node;
	}

	function el(tag, className, text) {
		var node = document.createElement(tag);
		if (className) node.className = className;
		if (text) node.textContent = text;
		return node;
	}

	/* ---------- geometry ---------- */

	// Quadratic curve between two node rims, bowed sideways by `edge.bow`.
	function curve(edge) {
		var a = byId(edge.from);
		var b = byId(edge.to);
		var dx = b.x - a.x;
		var dy = b.y - a.y;
		var len = Math.sqrt(dx * dx + dy * dy) || 1;
		var ux = dx / len;
		var uy = dy / len;
		var p0 = { x: a.x + ux * radius(a), y: a.y + uy * radius(a) };
		var p1 = { x: b.x - ux * radius(b), y: b.y - uy * radius(b) };
		var bow = edge.bow || 0;

		return {
			p0: p0,
			p1: p1,
			c: {
				x: (p0.x + p1.x) / 2 - uy * bow,
				y: (p0.y + p1.y) / 2 + ux * bow
			}
		};
	}

	function pointAt(geom, t) {
		var m = 1 - t;
		return {
			x: m * m * geom.p0.x + 2 * m * t * geom.c.x + t * t * geom.p1.x,
			y: m * m * geom.p0.y + 2 * m * t * geom.c.y + t * t * geom.p1.y
		};
	}

	function pathData(geom) {
		return 'M ' + geom.p0.x + ' ' + geom.p0.y +
			' Q ' + geom.c.x + ' ' + geom.c.y +
			' ' + geom.p1.x + ' ' + geom.p1.y;
	}

	function curveLength(geom) {
		var total = 0;
		var previous = geom.p0;
		for (var i = 1; i <= 12; i++) {
			var next = pointAt(geom, i / 12);
			total += Math.sqrt(Math.pow(next.x - previous.x, 2) + Math.pow(next.y - previous.y, 2));
			previous = next;
		}
		return total;
	}

	function layout(width) {
		var vertical = width < CFG.breakpoint;
		var chain = (vertical ? CHAIN_TALL : CHAIN_WIDE).map(byId);
		var chainEdges = [];
		var i;

		for (i = 0; i < chain.length - 1; i++) {
			chainEdges.push(edgeBetween(chain[i].id, chain[i + 1].id));
		}

		if (vertical) {
			for (i = 0; i < chainEdges.length; i++) {
				chainEdges[i].length = chainEdges[i].future ? CFG.goalEdge :
					clamp(chainEdges[i].weight * CFG.vPerMonth, CFG.vMinEdge, CFG.vMaxEdge);
			}
		} else {
			var weight = 0;
			var fixedPx = CFG.padX * 2;
			for (i = 0; i < chain.length; i++) fixedPx += radius(chain[i]) * 2;
			for (i = 0; i < chainEdges.length; i++) {
				if (chainEdges[i].future) fixedPx += CFG.goalEdge;
				else weight += chainEdges[i].weight;
			}
			var perMonth = weight > 0 ? Math.max(width - fixedPx, CFG.minEdge * 4) / weight : 0;
			for (i = 0; i < chainEdges.length; i++) {
				chainEdges[i].length = chainEdges[i].future ? CFG.goalEdge :
					clamp(chainEdges[i].weight * perMonth, CFG.minEdge, CFG.maxEdge);
			}
		}

		var cursor = vertical ? CFG.vPadTop : CFG.padX;
		for (i = 0; i < chain.length; i++) {
			var r = radius(chain[i]);
			cursor += r;
			chain[i].x = vertical ? CFG.vSpineX : cursor;
			chain[i].y = vertical ? cursor : CFG.spineY;
			cursor += r + (chainEdges[i] ? chainEdges[i].length : 0);
		}

		if (!vertical) {
			var branch = byId('aicrowd');
			branch.x = byId('iitg').x + 66;
			branch.y = CFG.branchY;
		}

		// Chain edges ripple gently; the edge that leaves the chain bows clear of it.
		for (i = 0; i < EDGES.length; i++) EDGES[i].bow = 0;
		for (i = 0; i < chainEdges.length; i++) {
			chainEdges[i].bow = (i % 2 ? 1 : -1) * (vertical ? 14 : 16);
		}
		if (vertical) {
			edgeBetween('iitg', 'infosys').bow = 72;
		} else {
			edgeBetween('iitg', 'aicrowd').bow = -22;
			edgeBetween('aicrowd', 'infosys').bow = -22;
		}

		return {
			vertical: vertical,
			chain: chain,
			chainEdges: chainEdges,
			width: vertical ? width : Math.max(width, cursor + CFG.padX),
			height: vertical ? cursor + 32 : CFG.height
		};
	}

	/* ---------- drawing ---------- */

	function drawEdge(root, edge, plan) {
		var geom = curve(edge);
		var line = svg('path', {
			'class': 'jg-edge' + (edge.future ? ' jg-edge--soft' : '') +
				(plan.chainEdges.indexOf(edge) < 0 ? ' jg-edge--alt' : ''),
			d: pathData(geom),
			fill: 'none'
		});
		root.appendChild(line);
		state.edges[edgeKey(edge)] = { el: line, geom: geom };

		// Only chain edges carry a weight chip; the bypass would just repeat one.
		if (plan.chainEdges.indexOf(edge) < 0) return;

		var label = edge.future ? 'next' : months(edge.weight);
		var mid = pointAt(geom, 0.5);
		var halfW = 6 + label.length * 3.4;
		root.appendChild(svg('rect', {
			'class': 'jg-chip-bg',
			x: mid.x - halfW,
			y: mid.y - 8,
			width: halfW * 2,
			height: 16,
			rx: 8
		}));
		var text = svg('text', { 'class': 'jg-chip', x: mid.x, y: mid.y, dy: '0.34em' });
		text.textContent = label;
		root.appendChild(text);
	}

	function drawNode(root, defs, node, vertical) {
		var r = radius(node);
		var group = svg('g', {
			id: 'jg-node-' + node.id,
			'class': 'jg-node jg-node--' + node.kind + (node.id === selectedId ? ' is-active' : ''),
			tabindex: '0',
			role: 'button',
			'aria-label': node.name + ', ' + node.role
		});

		var title = svg('title');
		title.textContent = node.name + ' · ' + node.period;
		group.appendChild(title);

		if (node.current) {
			group.appendChild(svg('circle', { 'class': 'jg-pulse', cx: node.x, cy: node.y, r: r + 5 }));
		}

		group.appendChild(svg('circle', { 'class': 'jg-disc', cx: node.x, cy: node.y, r: r }));

		if (node.logo) {
			var clipId = 'jg-clip-' + node.id;
			var clip = svg('clipPath', { id: clipId });
			clip.appendChild(svg('circle', { cx: node.x, cy: node.y, r: r - 5 }));
			defs.appendChild(clip);

			var image = svg('image', {
				x: node.x - (r - 5),
				y: node.y - (r - 5),
				width: (r - 5) * 2,
				height: (r - 5) * 2,
				preserveAspectRatio: 'xMidYMid meet',
				'clip-path': 'url(#' + clipId + ')'
			});
			image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', node.logo);
			image.setAttribute('href', node.logo);
			group.appendChild(image);
		} else if (node.icon) {
			var icon = svg('text', { 'class': 'jg-icon', x: node.x, y: node.y, dy: '0.36em' });
			icon.textContent = node.icon;
			group.appendChild(icon);
		}

		var labelX;
		var labelY;
		var anchor;
		if (vertical || node.branch) {
			labelX = node.x + r + 14;
			labelY = node.y - 1;
			anchor = 'start';
		} else {
			labelX = node.x;
			labelY = node.y + r + 20;
			anchor = 'middle';
		}

		var name = svg('text', { 'class': 'jg-name', x: labelX, y: labelY, 'text-anchor': anchor });
		name.textContent = node.name;
		group.appendChild(name);

		var period = svg('text', { 'class': 'jg-period', x: labelX, y: labelY + 15, 'text-anchor': anchor });
		period.textContent = node.short || node.period;
		group.appendChild(period);

		group.addEventListener('click', function () { select(node.id); });
		group.addEventListener('keydown', function (event) {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				select(node.id);
			}
		});

		root.appendChild(group);
		state.nodes[node.id] = group;
	}

	/* ---------- Dijkstra ---------- */

	function dijkstra(sourceId, targetId) {
		var dist = {};
		var prev = {};
		var settled = {};
		var visited = [];
		var i;

		for (i = 0; i < NODES.length; i++) dist[NODES[i].id] = Infinity;
		dist[sourceId] = 0;

		while (true) {
			var pick = null;
			for (i = 0; i < NODES.length; i++) {
				var id = NODES[i].id;
				if (settled[id] || dist[id] === Infinity) continue;
				if (pick === null || dist[id] < dist[pick]) pick = id;
			}
			if (pick === null) break;

			settled[pick] = true;

			// Relax before snapshotting so the step shows what this node discovered.
			for (i = 0; i < EDGES.length; i++) {
				if (EDGES[i].from !== pick) continue;
				var candidate = dist[pick] + EDGES[i].weight;
				if (candidate < dist[EDGES[i].to]) {
					dist[EDGES[i].to] = candidate;
					prev[EDGES[i].to] = EDGES[i];
				}
			}

			var snapshot = {};
			for (i = 0; i < NODES.length; i++) {
				if (dist[NODES[i].id] !== Infinity) snapshot[NODES[i].id] = dist[NODES[i].id];
			}
			visited.push({ id: pick, snapshot: snapshot });

			if (pick === targetId) break;
		}

		var path = [];
		var cursor = targetId;
		while (prev[cursor]) {
			path.unshift(prev[cursor]);
			cursor = prev[cursor].from;
		}

		return { visited: visited, path: path, total: dist[targetId], from: sourceId };
	}

	/* ---------- run animation ---------- */

	function stopRun() {
		for (var i = 0; i < run.timers.length; i++) window.clearTimeout(run.timers[i]);
		run.timers = [];
		if (run.frame) window.cancelAnimationFrame(run.frame);
		run.frame = null;

		var button = document.getElementById('journeyRun');
		if (button) button.disabled = false;
	}

	function clearVisuals() {
		var id;
		for (id in state.nodes) {
			if (state.nodes[id]) state.nodes[id].classList.remove('is-settled');
		}
		for (id in state.edges) {
			if (state.edges[id]) state.edges[id].el.classList.remove('is-path', 'is-dim');
		}
		if (state.layer) state.layer.innerHTML = '';

		var result = document.getElementById('journeyResult');
		if (result) result.textContent = '';
	}

	function showDistances(snapshot) {
		if (!state.layer) return;
		state.layer.innerHTML = '';

		for (var id in snapshot) {
			if (!Object.prototype.hasOwnProperty.call(snapshot, id)) continue;
			var node = byId(id);
			var label = String(snapshot[id]);
			var halfW = 7 + label.length * 3.6;
			var y = node.y - radius(node) - 9;

			state.layer.appendChild(svg('rect', {
				'class': 'jg-dist-bg',
				x: node.x - halfW,
				y: y - 8,
				width: halfW * 2,
				height: 16,
				rx: 8
			}));
			var text = svg('text', { 'class': 'jg-dist', x: node.x, y: y, dy: '0.34em' });
			text.textContent = label;
			state.layer.appendChild(text);
		}
	}

	function travel(path) {
		var stops = [];
		var total = 0;
		var i;

		for (i = 0; i < path.length; i++) {
			var geom = state.edges[edgeKey(path[i])].geom;
			var length = curveLength(geom);
			stops.push({ geom: geom, length: length, start: total });
			total += length;
		}
		if (!total) return;

		var runner = svg('circle', { 'class': 'jg-runner', cx: stops[0].geom.p0.x, cy: stops[0].geom.p0.y, r: 5 });
		state.layer.appendChild(runner);

		var started = null;
		function frame(now) {
			if (started === null) started = now;
			var progress = Math.min((now - started) / CFG.travelMs, 1);
			var walked = progress * total;

			var leg = stops[stops.length - 1];
			for (var j = 0; j < stops.length; j++) {
				if (walked <= stops[j].start + stops[j].length) {
					leg = stops[j];
					break;
				}
			}

			var point = pointAt(leg.geom, clamp((walked - leg.start) / leg.length, 0, 1));
			runner.setAttribute('cx', point.x);
			runner.setAttribute('cy', point.y);

			if (progress < 1) run.frame = window.requestAnimationFrame(frame);
			else run.frame = null;
		}
		run.frame = window.requestAnimationFrame(frame);
	}

	// Always solved from the first node, so the total is the career time it took
	// to reach whichever node is selected.
	function runTarget() {
		return selectedId === ROOT ? GOAL : selectedId;
	}

	function runAlgorithm() {
		if (!state.plan) return;

		var result = dijkstra(ROOT, runTarget());
		if (!result.path.length) return;

		stopRun();
		clearVisuals();

		var button = document.getElementById('journeyRun');
		if (button) button.disabled = true;

		for (var i = 0; i < result.visited.length; i++) {
			(function (visit, index) {
				run.timers.push(window.setTimeout(function () {
					showDistances(visit.snapshot);
					if (state.nodes[visit.id]) state.nodes[visit.id].classList.add('is-settled');
				}, index * CFG.stepMs));
			})(result.visited[i], i);
		}

		run.timers.push(window.setTimeout(function () {
			var onPath = {};
			var j;
			for (j = 0; j < result.path.length; j++) onPath[edgeKey(result.path[j])] = true;
			for (var key in state.edges) {
				if (!Object.prototype.hasOwnProperty.call(state.edges, key)) continue;
				state.edges[key].el.classList.add(onPath[key] ? 'is-path' : 'is-dim');
			}

			travel(result.path);
			showResult(result);
			if (button) button.disabled = false;
		}, result.visited.length * CFG.stepMs));
	}

	function showResult(result) {
		var target = document.getElementById('journeyResult');
		if (!target) return;

		var names = [byId(result.from).name];
		for (var i = 0; i < result.path.length; i++) names.push(byId(result.path[i].to).name);

		target.textContent = names.join(' → ') + '  ·  ' + result.total + ' mo (' +
			(result.total / 12).toFixed(1) + ' yrs)';
	}

	/* ---------- card + selection ---------- */

	function renderCard(node) {
		var card = document.getElementById('journeyCard');
		if (!card) return;
		card.innerHTML = '';

		var head = el('div', 'jg-card-head');
		if (node.logo) {
			var img = el('img', 'jg-card-logo');
			img.src = node.logo;
			img.alt = node.name + ' logo';
			head.appendChild(img);
		} else {
			head.appendChild(el('span', 'jg-card-logo jg-card-logo--icon', node.icon || ''));
		}

		var heading = el('div', 'jg-card-heading');
		var title = el('div', 'jg-card-title', node.name);
		if (node.current) title.appendChild(el('span', 'jg-badge', 'now'));
		if (node.kind === 'goal') title.appendChild(el('span', 'jg-badge jg-badge--goal', 'goal'));
		heading.appendChild(title);

		var meta = [node.role, node.place, node.period].filter(Boolean).join(' · ');
		heading.appendChild(el('div', 'jg-card-meta', meta));
		head.appendChild(heading);
		card.appendChild(head);

		var tags = el('div', 'jg-tags');
		for (var i = 0; i < node.tags.length; i++) tags.appendChild(el('span', 'jg-tag', node.tags[i]));
		card.appendChild(tags);

		var list = el('ul', 'jg-list');
		for (var j = 0; j < node.notes.length; j++) list.appendChild(el('li', null, node.notes[j]));
		card.appendChild(list);
	}

	function paintButton() {
		var button = document.getElementById('journeyRun');
		if (!button) return;
		button.textContent = '\u25B8 Dijkstra: ' + byId(ROOT).name + ' → ' + byId(runTarget()).name;
	}

	function select(id) {
		selectedId = id;
		stopRun();
		clearVisuals();

		for (var key in state.nodes) {
			if (state.nodes[key]) state.nodes[key].classList.remove('is-active');
		}
		if (state.nodes[id]) state.nodes[id].classList.add('is-active');

		paintButton();
		renderCard(byId(id));
	}

	/* ---------- render ---------- */

	function render() {
		var host = document.getElementById('journeyGraph');
		if (!host) return;

		stopRun();

		var width = host.clientWidth || lastWidth || 720;
		lastWidth = width;

		var plan = layout(width);
		state = { plan: plan, edges: {}, nodes: {}, layer: null };
		host.innerHTML = '';

		var root = svg('svg', {
			viewBox: '0 0 ' + Math.round(plan.width) + ' ' + Math.round(plan.height),
			width: Math.round(plan.width),
			height: Math.round(plan.height),
			'class': 'jg-svg',
			role: 'group',
			'aria-label': 'Career graph'
		});
		var defs = svg('defs');
		root.appendChild(defs);

		var i;
		for (i = 0; i < EDGES.length; i++) drawEdge(root, EDGES[i], plan);
		for (i = 0; i < plan.chain.length; i++) drawNode(root, defs, plan.chain[i], plan.vertical);
		if (!plan.vertical) drawNode(root, defs, byId('aicrowd'), plan.vertical);

		state.layer = svg('g', { 'class': 'jg-layer' });
		root.appendChild(state.layer);

		host.appendChild(root);

		var result = document.getElementById('journeyResult');
		if (result) result.textContent = '';

		paintButton();
		renderCard(byId(selectedId));
	}

	var resizeTimer = null;
	window.addEventListener('resize', function () {
		var host = document.getElementById('journeyGraph');
		if (!host || !host.clientWidth) return;
		window.clearTimeout(resizeTimer);
		resizeTimer = window.setTimeout(render, 150);
	});

	function init() {
		var button = document.getElementById('journeyRun');
		if (button) button.addEventListener('click', runAlgorithm);
		render();
	}

	window.JourneyGraph = { render: render };

	if (document.readyState !== 'loading') init();
	else document.addEventListener('DOMContentLoaded', init);
})(window, document);
