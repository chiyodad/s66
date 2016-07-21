const Matcher = class{
	static equalTo(format){
		return new Matcher('equal', format);
	}
	constructor(type, format){
		this.type = type;
		this.format = format;
	}
	result(str, ...arg){
		switch(this.type){
		case'equal':
			return str == this.format.replace(/(\$\{([0-9]+)\})/g, (v,v0,v1)=>arg[v1]);
		}
	}
};
module.exports = Matcher;
