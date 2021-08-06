import React from 'react'
import Board from 'react-trello'
import {from} from "fromit"
import Cookies from 'universal-cookie';
/* global grist */

const data = {
  lanes: [
    {
      id: 'lane1',
      title: 'Planned Tasks',
      label: '2/2',
      cards: [
        {id: 'Card1', title: 'Write Blog', description: 'Can AI make memes', label: '30 mins', draggable: false},
        {id: 'Card2', title: 'Pay Rent', description: 'Transfer via NEFT', label: '5 mins', metadata: {sha: 'be312a1'}}
      ]
    },
    {
      id: 'lane2',
      title: 'Completed',
      label: '0/0',
      cards: []
    }
  ]
}

function ColEditor({text, rows, onChange, selected}) {
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const options = columns.filter(x => x !== 'id').map(c => (
    <option value={c} key={c}>{c}</option>
  ));
  return <div className="px-3 py-2 flex gap-1 flex-wrap">
    <div class="text-white">{text}:</div>
    <select value={selected} onChange={(e) => onChange(e.target.value)}>
      <option value="">-- select --</option>
      {options}
    </select>
  </div>
}

const loading = {
  lanes: [
    {id: 'loading', title: 'loading', cards: []}
  ]
};
const cookies = new Cookies();

export default class App extends React.Component {
  state = {
    rows: [],
    lanes: null,
    title: null,
    desc: null,
  }

  config(state) {
    this.setState(state);
    if (this.state.lanes)
      cookies.set('lanes', this.state.lanes);
    if (this.state.title)
      cookies.set('title', this.state.title);
    if (this.state.desc)
      cookies.set('desc', this.state.desc);
  }

  componentDidMount() {

    this.setState({
      lanes: cookies.get("lanes"),
      title: cookies.get("title"),
      desc: cookies.get("desc"),
    })

    grist.ready();
    grist.onRecords((data) => {
      this.setState({rows: data});
    })

    this.setState({
      rows: [{
        Person: 'John',
        Color: 'Blue',
        Title: 'hello',
        id : 0,
      },
      {
        Person: 'John',
        Color: 'Red',
        id : 2,
        Title: 'hello'
      },
      {
        Person: 'Mary',
        id : 3,
        Color: 'Red',
        Title: 'hello'
      }]
    })
  }

  get board() {
    if (!this.state.rows || !this.state.lanes || !this.state.desc || !this.state.title) {
      return loading;
    }
    const title = (x) => (x === null || x === undefined || x === '') ? 'Unnamed' : `${x}`;
    const grouped = from(this.state.rows).groupBy(x => title(x[this.state.lanes]));
    const lanes = grouped.map(l => {
      return {
        id: title(l.key),
        title: title(l.key),
        cards: l.map(c => ({
          id: c.id,
          title: (title(c[this.state.title]) || '').substring(0, 20),
          description: `${c[this.state.desc]}`,
          draggable: true
        })).toArray()
      }
    });
    console.log([...lanes])
    return {lanes : [...lanes]};
  }


  render() {
    return <div>
      <div class="flex gap-2 bg-green-600">
        <ColEditor text="Lanes" selected={this.state.lanes} rows={this.state.rows} onChange={lanes => this.config({lanes})} />
        <ColEditor text="Title" selected={this.state.title} rows={this.state.rows} onChange={title => this.config({title})} />
        <ColEditor text="Description" selected={this.state.desc} rows={this.state.rows} onChange={desc => this.config({desc})} />
      </div>
      <Board data={this.board} draggable className="bg-green-600" />
    </div>
  }
}
