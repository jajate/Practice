:root{
background:rgba(0,0,0,.25);
border:1px solid var(--line);
padding:10px 12px;
border-radius:999px;
color:var(--muted);
}


.prompt{
margin-top:18px;
border-top:1px solid var(--line);
padding-top:22px;
text-align:center;
}
.hint{color:var(--muted);margin-bottom:12px}


.bigWrap{display:grid;gap:8px;justify-items:center}
.big{
font-size:120px;
font-weight:900;
letter-spacing:6px;
line-height:1;
padding:20px 28px;
border-radius:18px;
border:1px solid var(--line);
background:rgba(0,0,0,.18);
min-width:220px;
}
.bigSub{
color:var(--muted);
font-weight:700;
letter-spacing:1px;
}


.big.hit{ outline:2px solid rgba(53,208,127,.7); box-shadow:0 0 0 8px rgba(53,208,127,.12); }
.big.miss{ outline:2px solid rgba(255,90,107,.7); box-shadow:0 0 0 8px rgba(255,90,107,.10); }


.seq{
margin-top:16px;
font-size:20px;
letter-spacing:6px;
color:var(--muted);
display:flex;
gap:10px;
justify-content:center;
flex-wrap:wrap;
}
.seq .ch{
padding:8px 10px;
border-radius:12px;
border:1px solid var(--line);
background:rgba(0,0,0,.12);
min-width:36px;
text-align:center;
font-weight:800;
}
.seq .cur{
color:#0b1220;
background:linear-gradient(180deg, #ffcf3a, var(--accent));
border-color:transparent;
}


.history{margin-top:22px;border-top:1px solid var(--line);padding-top:18px}
.historySummary{ text-align:center; padding:6px 0 12px; }
.historySummary h2{
margin:0 0 10px;
font-size:28px;
font-weight:900;
letter-spacing:.3px;
}
.sumLine{ font-size:20px; font-weight:800; margin:6px 0; }


.historyList{
display:grid;
gap:8px;
justify-items:center;
padding-bottom:4px;
}
.historyLine{
font-size:18px;
font-weight:800;
letter-spacing:.2px;
}
.historyLine .n{ color:var(--muted); font-weight:700; margin-right:8px; }
.historyLine .kpm{ color:#3aa6ff; }
.historyLine .avg{ color:var(--ok); }
.historyLine .fail{ color:var(--bad); }
